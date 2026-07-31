import mongoose, { Types, } from "mongoose";
import { Component, } from "../models/component.model.js";
import { Category } from "../models/category.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class ComponentService {
    static async createComponent(payload) {
        const categoryExists = await Category.exists({
            _id: payload.categoryId,
        });
        if (!categoryExists) {
            throw createHttpError("Category not found", 404);
        }
        try {
            return await Component.create(payload);
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component already exists", 409);
            }
            throw error;
        }
    }
    static async updateComponent(componentId, updateData) {
        if (updateData.categoryId !== undefined) {
            const categoryExists = await Category.exists({
                _id: updateData.categoryId,
            });
            if (!categoryExists) {
                throw createHttpError("Category not found", 404);
            }
        }
        try {
            const component = await Component.findByIdAndUpdate(componentId, {
                $set: updateData,
            }, {
                new: true,
                runValidators: true,
            }).lean();
            if (!component) {
                throw createHttpError("Component not found", 404);
            }
            return component;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component already exists", 409);
            }
            throw error;
        }
    }
    static async getDeactivationImpact(componentId) {
        const targetId = new Types.ObjectId(componentId);
        const [serviceComponents, pricing] = await Promise.all([
            ServiceComponent.find({
                componentId: targetId,
            }, {
                _id: 1,
                serviceId: 1,
            }).lean(),
            ServicePricing.find({
                componentId: targetId,
                isActive: true,
            }, {
                _id: 1,
            }).lean(),
        ]);
        return {
            affectedServicesCount: serviceComponents.length,
            pricingCount: pricing.length,
            serviceComponents,
        };
    }
    static async toggleComponentStatus(componentId, isActive, confirmed = false) {
        const component = await Component.findById(componentId)
            .select("_id isActive")
            .lean();
        if (!component) {
            throw createHttpError("Component not found", 404);
        }
        if (component.isActive === isActive) {
            return {
                success: true,
                unchanged: true,
                component,
            };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(componentId);
            if (impact.affectedServicesCount > 0 ||
                impact.pricingCount > 0) {
                return {
                    requiresConfirmation: true,
                    impact,
                };
            }
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const updatedComponent = await Component.findByIdAndUpdate(componentId, {
                $set: {
                    isActive,
                },
            }, {
                new: true,
                session,
            }).lean();
            if (!updatedComponent) {
                throw createHttpError("Component not found", 404);
            }
            if (!isActive) {
                await ServicePricing.updateMany({
                    componentId: new Types.ObjectId(componentId),
                    isActive: true,
                }, {
                    $set: {
                        isActive: false,
                    },
                }, {
                    session,
                });
            }
            await session.commitTransaction();
            return {
                success: true,
                component: updatedComponent,
            };
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getComponentById(componentId) {
        const component = await Component.findById(componentId).lean();
        if (!component) {
            throw createHttpError("Component not found", 404);
        }
        return component;
    }
    static async findComponents(params) {
        const { searchTerm, categoryId, limit = 20, page = 1, isRemovable, isActive, isBundled, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = (safePage - 1) * safeLimit;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (typeof isRemovable === "boolean") {
            query.isRemovable = isRemovable;
        }
        if (typeof isBundled === "boolean") {
            query.isBundled = isBundled;
        }
        if (categoryId) {
            query.categoryId =
                new Types.ObjectId(categoryId);
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
        if (isTextSearch &&
            sortBy === "relevance") {
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
                "isRemovable",
                "isBundled",
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
        const [components, total] = await Promise.all([
            Component.find(query, projection)
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            Component.countDocuments(query),
        ]);
        return {
            data: components,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
}
//# sourceMappingURL=component.service.js.map