import { Types } from "mongoose";
import { SubServiceComponent, } from "../models/subservices.model.js";
import { Service } from "../models/service.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class SubServiceComponentService {
    static async invalidateSubServiceComponentCache(subServiceComponentId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.subServiceComponentListPattern()),
        ];
        if (subServiceComponentId) {
            operations.push(RedisCacheService.delete(CacheKeys.subServiceComponentDetail(subServiceComponentId)));
        }
        await Promise.all(operations);
    }
    static async invalidateParentServiceCache(serviceIds) {
        const uniqueServiceIds = [
            ...new Set(serviceIds.filter(Boolean)),
        ];
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
        ];
        for (const serviceId of uniqueServiceIds) {
            operations.push(RedisCacheService.delete(CacheKeys.serviceFull(serviceId)), RedisCacheService.deleteByPattern(CacheKeys.serviceFullByCitiesPattern(serviceId)));
        }
        await Promise.all(operations);
    }
    static applyServiceFilter(filterValue) {
        if (!filterValue?.trim()) {
            return undefined;
        }
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .filter((value) => Types.ObjectId.isValid(value))
            .map((value) => new Types.ObjectId(value));
        return values.length > 0
            ? {
                $in: values,
            }
            : undefined;
    }
    static async createSubServiceComponent(payload) {
        if (!Types.ObjectId.isValid(payload.serviceId)) {
            throw createHttpError("Invalid service ID", 400);
        }
        const serviceExists = await Service.exists({
            _id: payload.serviceId,
        });
        if (!serviceExists) {
            throw createHttpError("Service not found", 404);
        }
        const subServiceComponent = await SubServiceComponent.create({
            name: payload.name.trim(),
            description: payload.description.trim(),
            serviceId: payload.serviceId,
            ...(payload.image !== undefined && {
                image: payload.image,
            }),
            ...(payload.isActive !== undefined && {
                isActive: payload.isActive,
            }),
        });
        await Promise.all([
            this.invalidateSubServiceComponentCache(),
            this.invalidateParentServiceCache([
                payload.serviceId,
            ]),
        ]);
        return subServiceComponent;
    }
    static async findSubServiceComponents(params) {
        const { searchTerm, serviceId, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        /*
         * Validate every supplied service ID
         * before generating a cache key.
         */
        if (serviceId?.trim()) {
            const serviceIds = serviceId
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
            const hasInvalidId = serviceIds.some((id) => !Types.ObjectId.isValid(id));
            if (hasInvalidId) {
                throw createHttpError("Invalid service ID", 400);
            }
        }
        const term = searchTerm?.trim();
        const isTextSearch = Boolean(term &&
            term.length > 4);
        const allowedSortFields = new Set([
            "name",
            "createdAt",
            "updatedAt",
            "isActive",
        ]);
        const safeSortBy = isTextSearch &&
            sortBy === "relevance"
            ? "relevance"
            : allowedSortFields.has(sortBy)
                ? sortBy
                : "createdAt";
        const cacheKey = CacheKeys.subServiceComponentList({
            searchTerm: term,
            serviceId,
            limit: safeLimit,
            page: safePage,
            isActive,
            sortBy: safeSortBy,
            sortOrder,
        });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS
                .SUB_SERVICE_COMPONENT_LIST,
            loader: async () => {
                const skip = safeLimit *
                    (safePage - 1);
                const query = {};
                if (typeof isActive ===
                    "boolean") {
                    query.isActive =
                        isActive;
                }
                const serviceFilter = this.applyServiceFilter(serviceId);
                if (serviceFilter) {
                    query.serviceId =
                        serviceFilter;
                }
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
                if (isTextSearch &&
                    safeSortBy ===
                        "relevance") {
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
                    sortCriteria = {
                        [safeSortBy]: sortOrder ===
                            "asc"
                            ? 1
                            : -1,
                    };
                    if (safeSortBy !==
                        "createdAt") {
                        sortCriteria.createdAt =
                            -1;
                    }
                }
                const [data, total,] = await Promise.all([
                    SubServiceComponent.find(query, projection)
                        .populate("serviceId", "name serviceReference isActive")
                        .sort(sortCriteria)
                        .skip(skip)
                        .limit(safeLimit)
                        .lean(),
                    SubServiceComponent
                        .countDocuments(query),
                ]);
                return {
                    data,
                    total,
                    page: safePage,
                    totalPages: Math.ceil(total /
                        safeLimit),
                };
            },
        });
    }
    static async updateSubServiceComponent(subServiceComponentId, updateData) {
        if (updateData.serviceId !== undefined) {
            const serviceExists = await Service.exists({
                _id: updateData.serviceId,
            });
            if (!serviceExists) {
                throw createHttpError("Service not found", 404);
            }
        }
        const normalizedUpdate = {
            ...updateData,
        };
        if (updateData.name !== undefined) {
            normalizedUpdate.name = updateData.name.trim();
        }
        if (updateData.description !== undefined) {
            normalizedUpdate.description = updateData.description.trim();
        }
        const existing = await SubServiceComponent.findById(subServiceComponentId)
            .select("serviceId")
            .lean();
        if (!existing) {
            throw createHttpError("Sub Service Component not found", 404);
        }
        const updatedSubServiceComponent = await SubServiceComponent.findByIdAndUpdate(subServiceComponentId, {
            $set: normalizedUpdate,
        }, {
            new: true,
            runValidators: true,
        })
            .populate("serviceId", "name serviceReference isActive")
            .lean();
        if (!updatedSubServiceComponent) {
            throw createHttpError("Sub Service Component not found", 404);
        }
        const affectedServiceIds = [
            existing.serviceId.toString(),
            ...(updatedSubServiceComponent.serviceId
                ? [
                    typeof updatedSubServiceComponent.serviceId ===
                        "object" &&
                        "_id" in updatedSubServiceComponent.serviceId
                        ? updatedSubServiceComponent.serviceId._id.toString()
                        : updatedSubServiceComponent.serviceId,
                ]
                : []),
        ];
        await Promise.all([
            this.invalidateSubServiceComponentCache(subServiceComponentId),
            this.invalidateParentServiceCache(affectedServiceIds),
        ]);
        return updatedSubServiceComponent;
    }
    static async toggleSubServiceComponent(subServiceComponentId, status) {
        const existing = await SubServiceComponent.findById(subServiceComponentId)
            .select("_id isActive serviceId")
            .lean();
        if (!existing) {
            throw createHttpError("Sub Service Component not found", 404);
        }
        if (existing.isActive === status) {
            return {
                ...existing,
                unchanged: true,
            };
        }
        const updatedSubServiceComponent = await SubServiceComponent
            .findByIdAndUpdate(subServiceComponentId, {
            $set: {
                isActive: status,
            },
        }, {
            new: true,
            runValidators: true,
        })
            .populate("serviceId", "name serviceReference isActive")
            .lean();
        if (!updatedSubServiceComponent) {
            throw createHttpError("Sub Service Component not found", 404);
        }
        await Promise.all([
            this.invalidateSubServiceComponentCache(subServiceComponentId),
            this.invalidateParentServiceCache([
                existing.serviceId.toString(),
            ]),
        ]);
        return updatedSubServiceComponent;
    }
    static async getSubServiceComponentById(subServiceComponentId) {
        if (!Types.ObjectId.isValid(subServiceComponentId)) {
            throw createHttpError("Invalid Sub Service Component ID", 400);
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.subServiceComponentDetail(subServiceComponentId),
            ttlSeconds: CACHE_TTL_SECONDS
                .SUB_SERVICE_COMPONENT_DETAIL,
            loader: async () => {
                const subServiceComponent = await SubServiceComponent.findById(subServiceComponentId)
                    .populate("serviceId", "name serviceReference isActive")
                    .lean()
                    .exec();
                if (!subServiceComponent) {
                    throw createHttpError("Sub Service Component not found", 404);
                }
                return subServiceComponent;
            },
        });
    }
}
//# sourceMappingURL=subservices.service.js.map