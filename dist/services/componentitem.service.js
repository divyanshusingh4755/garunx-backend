import { ComponentItem, } from "../models/componentitem.model.js";
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
    static async updateComponentItemStatus(componentItemId, isActive) {
        const componentItem = await ComponentItem.findByIdAndUpdate(componentItemId, {
            isActive,
        }, { new: true });
        if (!componentItem)
            throw new Error("Component Item not found");
        return {
            success: true,
            message: `Component item ${isActive ? "activated" : "deactivated"} successfully`,
        };
    }
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.js.map