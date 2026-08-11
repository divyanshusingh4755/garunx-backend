import { Types } from "mongoose";
import { SubServiceComponent, } from "../models/subservices.model.js";
import { Service } from "../models/service.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class SubServiceComponentService {
    static applyServiceFilter(filterValue) {
        if (!filterValue?.trim()) {
            return undefined;
        }
        const values = filterValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => new Types.ObjectId(value));
        return values.length > 0
            ? {
                $in: values,
            }
            : undefined;
    }
    static async createSubServiceComponent(payload) {
        const serviceExists = await Service.exists({
            _id: payload.serviceId,
        });
        if (!serviceExists) {
            throw createHttpError("Service not found", 404);
        }
        return SubServiceComponent.create({
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
    }
    static async findSubServiceComponents(params) {
        const { searchTerm, serviceId, limit = 40, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = safeLimit * (safePage - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        const serviceFilter = this.applyServiceFilter(serviceId);
        if (serviceFilter) {
            query.serviceId = serviceFilter;
        }
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
                "createdAt",
                "updatedAt",
                "isActive",
            ]);
            const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
            sortCriteria = {
                [safeSortBy]: sortOrder === "asc" ? 1 : -1,
            };
            if (safeSortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        const [data, total] = await Promise.all([
            SubServiceComponent.find(query, projection)
                .populate("serviceId", "name serviceReference isActive")
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            SubServiceComponent.countDocuments(query),
        ]);
        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
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
        return updatedSubServiceComponent;
    }
    static async toggleSubServiceComponent(subServiceComponentId, status) {
        const existing = await SubServiceComponent.findById(subServiceComponentId)
            .select("_id isActive")
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
        const updatedSubServiceComponent = await SubServiceComponent.findByIdAndUpdate(subServiceComponentId, {
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
        return updatedSubServiceComponent;
    }
    static async getSubServiceComponentById(subServiceComponentId) {
        const subServiceComponent = await SubServiceComponent.findById(subServiceComponentId)
            .populate("serviceId", "name serviceReference isActive")
            .lean()
            .exec();
        if (!subServiceComponent) {
            throw createHttpError("Sub Service Component not found", 404);
        }
        return subServiceComponent;
    }
}
//# sourceMappingURL=subservices.service.js.map