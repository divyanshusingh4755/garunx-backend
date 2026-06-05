import mongoose from "mongoose";
import { ComponentItem, } from "../models/componentitem.model.js";
import { Types } from "mongoose";
import { ServiceComponent } from "../models/servicecomponent.model.js";
export class ComponentItemService {
    static async createComponentItem(payload) {
        try {
            if (!payload.name)
                throw new Error("Component item name is required");
            const componentitem = await ComponentItem.create(payload);
            return componentitem;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error("Component Item already exists");
            }
            throw new Error(error.message || "Failed to component item");
        }
    }
    static async updateComponentItem(componentItemId, updateData) {
        try {
            const componentItem = await ComponentItem.findByIdAndUpdate(componentItemId, {
                $set: updateData,
            }, { new: true, runValidators: true });
            if (!componentItem)
                throw new Error("Component Item not found");
            return componentItem;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update component item");
        }
    }
    static async getComponentItemById(componentItemId) {
        try {
            const componentItem = await ComponentItem.findById(componentItemId);
            if (!componentItem)
                throw new Error("Component item not found");
            return componentItem;
        }
        catch (error) {
            throw new Error(error.message || "Failed to get component item by id");
        }
    }
    static async getAllComponentItems(searchTerm, limit = 20, page = 1, isActive, sortBy = "createdAt", sortOrder = "desc") {
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isActive === "boolean")
            query.isActive = isActive;
        if (searchTerm)
            query.$text = { $search: searchTerm };
        let sortCriteria = {};
        let projection = {};
        if (searchTerm && sortBy === "relevance") {
            projection = { score: { $meta: "textScore" } };
            sortCriteria = { score: { $meta: "textScore" } };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        }
        try {
            const [componentItem, total] = await Promise.all([
                ComponentItem.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                ComponentItem.countDocuments(query),
            ]);
            return {
                data: componentItem,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to get component Item");
        }
    }
    static async getDeactivationImpact(componentItemId) {
        const affected = await ServiceComponent.find({
            "items.itemId": componentItemId,
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
        if (!Types.ObjectId.isValid(componentItemId)) {
            throw new Error("Invalid componentItemId");
        }
        const componentItem = await ComponentItem.findById(componentItemId);
        if (!componentItem) {
            throw new Error("Component Item not found");
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(componentItemId);
            return {
                requiresConfirmation: true,
                impact,
            };
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // 1. Update ComponentItem itself
                await ComponentItem.findByIdAndUpdate(componentItemId, { isActive }, { session });
                // 2. REMOVE from ServiceComponent.items[]
                await ServiceComponent.updateMany({
                    "items.itemId": componentItemId,
                }, {
                    $pull: {
                        items: {
                            itemId: new mongoose.Types.ObjectId(componentItemId),
                        },
                    },
                }, { session });
            });
            return {
                success: true,
                message: `Component item ${isActive ? "activated" : "deactivated"} successfully`,
            };
        }
        catch (err) {
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.js.map