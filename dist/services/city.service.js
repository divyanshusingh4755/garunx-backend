import { Types } from "mongoose";
import { City } from "../models/city.model.js";
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
export class CityService {
    static async invalidateCityCache(cityId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.cityListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.locationIdsPattern()),
        ];
        if (cityId) {
            operations.push(RedisCacheService.delete(CacheKeys.cityDetail(cityId)));
        }
        await Promise.all(operations);
    }
    static applyStringFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue.split(",").map((value) => value.trim()).filter(Boolean);
        return values.length > 0 ? { $in: values } : undefined;
    }
    static applyObjectIdFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue.split(",").map((value) => value.trim()).filter((value) => Types.ObjectId.isValid(value)).map((value) => new Types.ObjectId(value));
        return values.length > 0 ? { $in: values } : undefined;
    }
    static async createCity(params) {
        const { name, country, stateId, image, description, location } = params;
        const validState = await State.exists({ _id: stateId, country });
        if (!validState) {
            throw createHttpError("State does not belong to country", 400);
        }
        const city = await City.create({
            name,
            country,
            stateId,
            ...(image !== undefined && { image }),
            ...(description !== undefined && { description }),
            ...(location !== undefined && { location }),
        });
        await this.invalidateCityCache();
        return city;
    }
    static async findCity(params) {
        const { searchTerm, cityFilter, stateIdFilter, countryFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc" } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term && term.length > 4);
        const allowedSortFields = new Set(["name", "country", "createdAt", "updatedAt",]);
        const safeSortBy = isTextSearch && sortBy === "relevance" ? "relevance" : allowedSortFields.has(sortBy) ? sortBy : "createdAt";
        const cacheKey = CacheKeys.cityList({ searchTerm, cityFilter, stateIdFilter, countryFilter, limit: safeLimit, page: safePage, isActive, sortBy: safeSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.CITY_LIST,
            loader: async () => {
                const skip = (safePage - 1) * safeLimit;
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                const cityQuery = this.applyStringFilter(cityFilter);
                const stateQuery = this.applyObjectIdFilter(stateIdFilter);
                const countryQuery = this.applyStringFilter(countryFilter);
                if (countryQuery) {
                    query.country = countryQuery;
                }
                if (stateQuery) {
                    query.stateId = stateQuery;
                }
                if (term && !isTextSearch) {
                    const nameSearch = { $regex: `^${escapeRegex(term)}`, $options: "i" };
                    if (cityQuery) {
                        query.$and = [{ name: cityQuery }, { name: nameSearch },];
                    }
                    else {
                        query.name = nameSearch;
                    }
                }
                else {
                    if (cityQuery) {
                        query.name = cityQuery;
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
                const [data, total,] = await Promise.all([
                    City.find(query, projection).populate("stateId", "name").sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                    City.countDocuments(query),
                ]);
                return {
                    data, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
                };
            },
        });
    }
    static async updateCity(cityId, updateData) {
        const existingCity = await City.findById(cityId).select("country stateId").lean();
        if (!existingCity) {
            throw createHttpError("City not found", 404);
        }
        const country = updateData.country ?? existingCity.country;
        const stateId = updateData.stateId ?? existingCity.stateId.toString();
        if (updateData.country !== undefined || updateData.stateId !== undefined) {
            const validState = await State.exists({ _id: stateId, country });
            if (!validState) {
                throw createHttpError("State does not belong to country", 400);
            }
        }
        const updatedCity = await City.findByIdAndUpdate(cityId, { $set: updateData }, { new: true, runValidators: true }).populate("stateId", "name").lean();
        if (!updatedCity) {
            throw createHttpError("City not found", 404);
        }
        await this.invalidateCityCache(cityId);
        return updatedCity;
    }
    static async softDeleteCity(cityId, status) {
        const updatedCity = await City.findByIdAndUpdate(cityId, { $set: { isActive: status } }, { new: true, runValidators: true }).lean();
        if (!updatedCity) {
            throw createHttpError("City not found", 404);
        }
        await this.invalidateCityCache(cityId);
        return updatedCity;
    }
    static async getCityById(cityId) {
        return RedisCacheService.getOrSet({
            key: CacheKeys.cityDetail(cityId),
            ttlSeconds: CACHE_TTL_SECONDS.CITY_DETAIL,
            loader: async () => {
                const city = await City.findById(cityId).populate("stateId", "name").lean();
                if (!city) {
                    throw createHttpError("City not found", 404);
                }
                return city;
            },
        });
    }
    static async exportCitiesToCsv(cityIds) {
        const query = {};
        // cityIds omitted: export ALL cities. cityIds supplied: export only selected cities.
        if (cityIds !== undefined) {
            const uniqueCityIds = [...new Set(cityIds),];
            query._id = { $in: uniqueCityIds };
        }
        const cities = await City.find(query).select(["_id", "name", "country", "stateId", "image", "description", "isActive", "location", "createdAt", "updatedAt",].join(" ")).sort({ name: 1, createdAt: -1 }).lean();
        if (cities.length === 0) {
            throw createHttpError("No cities found for export", 404);
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            let stringValue = String(value);
            // Prevent spreadsheet applications from interpreting exported values as formulas.
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue = `'${stringValue}`;
            }
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["City ID", "City Name", "Country", "State ID", "Active", "Longitude", "Latitude", "Image", "Description", "Created At", "Updated At",];
        const rows = cities.map((city) => [city._id.toString(), city.name, city.country, city.stateId.toString(), city.isActive, city.location?.coordinates?.[0] ?? "", city.location?.coordinates?.[1] ?? "", city.image ?? "", city.description ?? "", city.createdAt ? new Date(city.createdAt).toISOString() : "", city.updatedAt ? new Date(city.updatedAt).toISOString() : "",]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(",")),].join("\n");
        return { csv, total: cities.length };
    }
}
//# sourceMappingURL=city.service.js.map