import {} from "mongoose";
import { State, } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class StateService {
    static applyFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        return values.length > 0 ? { $in: values } : undefined;
    }
    static async createState(params) {
        const { name, country, gstCode, image, description, location, } = params;
        return State.create({
            name: name.trim(),
            country: country.trim(),
            gstCode: gstCode.trim(),
            ...(image !== undefined && {
                image,
            }),
            ...(description !== undefined && {
                description,
            }),
            ...(location !== undefined && {
                location,
            }),
        });
    }
    static async findState(params) {
        const { searchTerm, countryFilter, stateFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = safeLimit * (safePage - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        const countryQuery = this.applyFilter(countryFilter);
        const stateQuery = this.applyFilter(stateFilter);
        if (countryQuery)
            query.country = countryQuery;
        if (stateQuery)
            query.name = stateQuery;
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term && term.length > 4);
        if (term) {
            if (isTextSearch) {
                query.$text = {
                    $search: term,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(term)}`,
                    $options: "i",
                };
            }
        }
        let projection;
        let sortCriteria;
        if (isTextSearch && sortBy === "relevance") {
            projection = {
                score: {
                    $meta: "textScore",
                },
            };
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            const allowedSortFields = new Set([
                "name",
                "country",
                "gstCode",
                "createdAt",
                "updatedAt",
            ]);
            const safeSortBy = allowedSortFields.has(sortBy)
                ? sortBy
                : "createdAt";
            sortCriteria = {
                [safeSortBy]: sortOrder === "asc" ? 1 : -1,
            };
            if (safeSortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        const [data, total] = await Promise.all([
            State.find(query, projection)
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            State.countDocuments(query),
        ]);
        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async updateState(stateId, updateData) {
        const updatedState = await State.findByIdAndUpdate(stateId, {
            $set: updateData,
        }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedState) {
            throw createHttpError("State not found", 404);
        }
        return updatedState;
    }
    static async softDeleteState(stateId, status) {
        const updatedState = await State.findByIdAndUpdate(stateId, {
            $set: {
                isActive: status,
            },
        }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedState) {
            throw createHttpError("State not found", 404);
        }
        return updatedState;
    }
    static async getStateById(stateId) {
        const state = await State.findById(stateId)
            .lean()
            .exec();
        if (!state) {
            throw createHttpError("State not found", 404);
        }
        return state;
    }
}
//# sourceMappingURL=state.service.js.map