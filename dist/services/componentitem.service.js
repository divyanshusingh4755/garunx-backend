import { Types, } from "mongoose";
import { ComponentItem, } from "../models/componentitem.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class ComponentItemService {
    static async createComponentItem(payload) {
        try {
            return await ComponentItem.create(payload);
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component item already exists", 409);
            }
            throw error;
        }
    }
    static async updateComponentItem(componentItemId, updateData) {
        try {
            const componentItem = await ComponentItem.findByIdAndUpdate(componentItemId, {
                $set: updateData,
            }, {
                new: true,
                runValidators: true,
            }).lean();
            if (!componentItem) {
                throw createHttpError("Component item not found", 404);
            }
            return componentItem;
        }
        catch (error) {
            if (error?.code === 11000) {
                throw createHttpError("Component item already exists", 409);
            }
            throw error;
        }
    }
    static async getComponentItemById(componentItemId) {
        const componentItem = await ComponentItem.findById(componentItemId).lean();
        if (!componentItem) {
            throw createHttpError("Component item not found", 404);
        }
        return componentItem;
    }
    static async getAllComponentItems(params) {
        const { searchTerm, limit = 20, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = (safePage - 1) * safeLimit;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
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
                "price",
                "isActive",
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
        const [componentItems, total] = await Promise.all([
            ComponentItem.find(query, projection)
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            ComponentItem.countDocuments(query),
        ]);
        return {
            data: componentItems,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async getDeactivationImpact(componentItemId) {
        const itemId = new Types.ObjectId(componentItemId);
        const affected = await ServiceComponent.find({
            items: {
                $elemMatch: {
                    itemId,
                },
            },
        }, {
            _id: 1,
            serviceId: 1,
            componentId: 1,
            items: 1,
        }).lean();
        return {
            affectedServiceComponentsCount: affected.length,
            affected,
        };
    }
    static async updateComponentItemStatus(componentItemId, isActive, confirmed = false) {
        const componentItem = await ComponentItem.findById(componentItemId)
            .select("_id isActive")
            .lean();
        if (!componentItem) {
            throw createHttpError("Component item not found", 404);
        }
        if (componentItem.isActive === isActive) {
            return {
                success: true,
                unchanged: true,
                componentItem,
            };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(componentItemId);
            if (impact.affectedServiceComponentsCount > 0) {
                return {
                    requiresConfirmation: true,
                    impact,
                };
            }
        }
        const updatedComponentItem = await ComponentItem.findByIdAndUpdate(componentItemId, {
            $set: {
                isActive,
            },
        }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedComponentItem) {
            throw createHttpError("Component item not found", 404);
        }
        return {
            success: true,
            componentItem: updatedComponentItem,
        };
    }
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.js.map