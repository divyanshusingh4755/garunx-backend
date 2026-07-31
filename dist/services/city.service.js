import { Types, } from "mongoose";
import { City, } from "../models/city.model.js";
import { State } from "../models/state.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class CityService {
    static applyStringFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        return values.length > 0 ? { $in: values } : undefined;
    }
    static applyObjectIdFilter(filterValue) {
        if (!filterValue?.trim())
            return undefined;
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter((value) => Types.ObjectId.isValid(value))
            .map((value) => new Types.ObjectId(value));
        return values.length > 0 ? { $in: values } : undefined;
    }
    static async createCity(params) {
        const { name, country, stateId, image, description, location, } = params;
        const validState = await State.exists({
            _id: stateId,
            country,
        });
        if (!validState) {
            throw createHttpError("State does not belong to country", 400);
        }
        return City.create({
            name,
            country,
            stateId,
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
    static async findCity(params) {
        const { searchTerm, cityFilter, stateIdFilter, countryFilter, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = (safePage - 1) * safeLimit;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        const cityQuery = this.applyStringFilter(cityFilter);
        const stateQuery = this.applyObjectIdFilter(stateIdFilter);
        const countryQuery = this.applyStringFilter(countryFilter);
        if (cityQuery)
            query.name = cityQuery;
        if (stateQuery)
            query.stateId = stateQuery;
        if (countryQuery)
            query.country = countryQuery;
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
            City.find(query, projection)
                .populate("stateId", "name")
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            City.countDocuments(query),
        ]);
        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async updateCity(cityId, updateData) {
        const existingCity = await City.findById(cityId)
            .select("country stateId")
            .lean();
        if (!existingCity) {
            throw createHttpError("City not found", 404);
        }
        const country = updateData.country ?? existingCity.country;
        const stateId = updateData.stateId ??
            existingCity.stateId.toString();
        if (updateData.country !== undefined ||
            updateData.stateId !== undefined) {
            const validState = await State.exists({
                _id: stateId,
                country,
            });
            if (!validState) {
                throw createHttpError("State does not belong to country", 400);
            }
        }
        const updatedCity = await City.findByIdAndUpdate(cityId, {
            $set: updateData,
        }, {
            new: true,
            runValidators: true,
        })
            .populate("stateId", "name")
            .lean();
        if (!updatedCity) {
            throw createHttpError("City not found", 404);
        }
        return updatedCity;
    }
    static async softDeleteCity(cityId, status) {
        const updatedCity = await City.findByIdAndUpdate(cityId, {
            $set: {
                isActive: status,
            },
        }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedCity) {
            throw createHttpError("City not found", 404);
        }
        return updatedCity;
    }
    static async getCityById(cityId) {
        const city = await City.findById(cityId)
            .populate("stateId", "name")
            .lean();
        if (!city) {
            throw createHttpError("City not found", 404);
        }
        return city;
    }
}
//# sourceMappingURL=city.service.js.map