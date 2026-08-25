import {} from "mongoose";
import { State } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class StateService {
    static async invalidateStateCache(stateId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.stateListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.cityListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.cityDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationIdsPattern()),
        ];
        if (stateId) {
            operations.push(RedisCacheService.delete(CacheKeys.stateDetail(stateId)));
        }
        await Promise.all(operations);
    }
    static applyFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue.split(",").map((value) => value.trim()).filter(Boolean);
        return values.length > 0 ? { $in: values } : undefined;
    }
    static async createState(params) {
        const { name, country, gstCode, image, description, location } = params;
        const state = await State.create({
            name: name.trim(),
            country: country.trim(),
            gstCode: gstCode.trim(),
            ...(image !== undefined && { image }),
            ...(description !== undefined && { description }),
            ...(location !== undefined && { location }),
        });
        await this.invalidateStateCache();
        return state;
    }
    static async findState(params) {
        const { searchTerm, countryFilter, stateFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc" } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term && term.length > 4);
        const allowedSortFields = new Set(["name", "country", "gstCode", "createdAt", "updatedAt"]);
        const safeSortBy = isTextSearch && sortBy === "relevance" ? "relevance" : allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        const cacheKey = CacheKeys.stateList({ searchTerm, countryFilter, stateFilter, limit: safeLimit, page: safePage, isActive, sortBy: safeSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.STATE_LIST,
            loader: async () => {
                const skip = safeLimit * (safePage - 1);
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                const countryQuery = this.applyFilter(countryFilter);
                const stateQuery = this.applyFilter(stateFilter);
                if (countryQuery) {
                    query.country = countryQuery;
                }
                if (term && !isTextSearch) {
                    const nameSearch = { $regex: `^${escapeRegex(term)}`, $options: "i" };
                    if (stateQuery) {
                        query.$and = [{ name: stateQuery }, { name: nameSearch }];
                    }
                    else {
                        query.name = nameSearch;
                    }
                }
                else {
                    if (stateQuery) {
                        query.name = stateQuery;
                    }
                    if (term && isTextSearch) {
                        query.$text = { $search: term };
                    }
                }
                let projection;
                let sortCriteria;
                if (isTextSearch && safeSortBy === "relevance") {
                    projection = { score: { $meta: "textScore" } };
                    sortCriteria = { score: { $meta: "textScore" } };
                }
                else {
                    sortCriteria = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };
                    if (safeSortBy !== "createdAt") {
                        sortCriteria.createdAt = -1;
                    }
                }
                const [data, total] = await Promise.all([
                    State.find(query, projection).sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                    State.countDocuments(query),
                ]);
                return {
                    data, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async updateState(stateId, updateData) {
        const updatedState = await State.findByIdAndUpdate(stateId, { $set: updateData }, { new: true, runValidators: true }).lean();
        if (!updatedState) {
            throw createHttpError("State not found", 404);
        }
        await this.invalidateStateCache(stateId);
        return updatedState;
    }
    static async softDeleteState(stateId, status) {
        const updatedState = await State.findByIdAndUpdate(stateId, { $set: { isActive: status } }, { new: true, runValidators: true }).lean();
        if (!updatedState) {
            throw createHttpError("State not found", 404);
        }
        await this.invalidateStateCache(stateId);
        return updatedState;
    }
    static async getStateById(stateId) {
        const state = await State.findById(stateId).lean().exec();
        if (!state) {
            throw createHttpError("State not found", 404);
        }
        return state;
    }
    static async exportStatesToCsv(params) {
        const { exportAll = false, stateIds } = params;
        let query = {};
        if (!exportAll) {
            const uniqueStateIds = [...new Set(stateIds ?? [])];
            if (uniqueStateIds.length === 0) {
                throw createHttpError("At least one state ID is required", 400);
            }
            query = { _id: { $in: uniqueStateIds } };
        }
        const states = await State.find(query).select(["country", "name", "gstCode", "description", "image", "isActive", "location", "createdAt", "updatedAt"].join(" ")).sort({ country: 1, name: 1 }).lean();
        if (states.length === 0) {
            throw createHttpError("No states found for export", 404);
        }
        // If selected IDs were supplied, make sure every requested state exists.
        if (!exportAll && stateIds) {
            const requestedCount = new Set(stateIds).size;
            if (states.length !== requestedCount) {
                throw createHttpError("One or more selected states were not found", 404);
            }
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            let stringValue = String(value);
            // Protect CSV files opened in Excel from formula injection.
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue = `'${stringValue}`;
            }
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["State ID", "Country", "State Name", "GST Code", "Description", "Image", "Status", "Longitude", "Latitude", "Created At", "Updated At"];
        const rows = states.map((state) => [
            state._id.toString(),
            state.country,
            state.name,
            state.gstCode,
            state.description ?? "",
            state.image ?? "",
            state.isActive ? "Active" : "Inactive",
            state.location?.coordinates?.[0] ?? "",
            state.location?.coordinates?.[1] ?? "",
            state.createdAt ? new Date(state.createdAt).toISOString() : "",
            state.updatedAt ? new Date(state.updatedAt).toISOString() : "",
        ]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: states.length };
    }
}
//# sourceMappingURL=state.service.js.map