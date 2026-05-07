import { Types } from "mongoose";
import { Component } from "../models/component.model.js";
export class ComponentService {
    static async createComponent(payload) {
        try {
            const component = await Component.create(payload);
            return component;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error("Component already exists");
            }
            throw new Error(error.message || "Failed to create component");
        }
    }
    static async updateComponent(componentId, updateData) {
        try {
            if (!Types.ObjectId.isValid(componentId)) {
                throw new Error("Invalid componentId");
            }
            const component = await Component.findById(componentId);
            if (!component)
                throw new Error("Component not found");
            const allowedFields = [
                "name",
                "description",
                "imageUrl",
                "categoryId",
                "isActive",
                "isBundled",
                "isRemovable",
            ];
            for (const key of allowedFields) {
                if (updateData[key] !== undefined) {
                    component[key] = updateData[key];
                }
            }
            await component.save();
            return component;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update component");
        }
    }
    static async toggleComponentStatus(componentId, isActive) {
        if (!Types.ObjectId.isValid(componentId)) {
            throw new Error("Invalid componentId");
        }
        const component = await Component.findById(componentId);
        if (!component)
            throw new Error("Component not found");
        component.isActive = isActive;
        await component.save();
        return {
            success: true,
            message: `Component ${isActive ? "activated" : "deactivated"} successfully`,
        };
    }
    static async getComponentById(componentId) {
        if (!Types.ObjectId.isValid(componentId)) {
            throw new Error("Invalid componentId");
        }
        const component = await Component.findById(componentId).lean();
        if (!component)
            throw new Error("Component not found");
        return component;
    }
    static async FindComponents(searchTerm, categoryId, limit = 20, page = 1, isRemovable, isActive, isBundled, sortBy = "createdAt", sortOrder = "desc") {
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isActive === "boolean")
            query.isActive = isActive;
        if (typeof isRemovable === "boolean")
            query.isRemovable = isRemovable;
        if (typeof isBundled === "boolean")
            query.isBundled = isBundled;
        if (searchTerm)
            query.$text = { $search: searchTerm };
        if (categoryId) {
            if (!Types.ObjectId.isValid(categoryId)) {
                throw new Error("Invalid categoryId");
            }
            query.categoryId = new Types.ObjectId(categoryId);
        }
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
            const [components, total] = await Promise.all([
                Component.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Component.countDocuments(query),
            ]);
            return {
                data: components,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Component fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=component.service.js.map