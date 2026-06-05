import mongoose from "mongoose";
import { Category } from "../models/category.model.js";
import { Component } from "../models/component.model.js";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
export class CategoryService {
    static async createCategory(categoryData) {
        if (!categoryData.value) {
            throw new Error("Category value is required");
        }
        const existingCategory = await Category.findOne({
            value: categoryData.value,
        });
        if (existingCategory) {
            throw new Error(`Category with value '${categoryData.value}' already exists`);
        }
        const category = new Category(categoryData);
        return await category.save();
    }
    static async updateCategory(id, updateData) {
        if (updateData.value) {
            const existing = await Category.findOne({
                value: updateData.value,
                _id: { $ne: id },
            });
            if (existing) {
                throw new Error(`Category with value '${updateData.value}' already exists`);
            }
        }
        const category = await Category.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!category)
            throw new Error("Category not found");
        return category;
    }
    static async getCategoryById(id) {
        const category = await Category.findById(id).lean();
        if (!category) {
            throw new Error("Category not found");
        }
        return category;
    }
    static async deleteCategory(id) {
        const category = await Category.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }
        const hasProducts = await Component.exists({
            categoryName: category.value,
        });
        if (hasProducts)
            throw new Error("Cannot delete category being used by products");
        return await Category.findByIdAndDelete(id);
    }
    static async getDeactivationImpact(categoryId) {
        const [components, services, packages] = await Promise.all([
            Component.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
            Service.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
            Package.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
        ]);
        return {
            componentsCount: components.length,
            servicesCount: services.length,
            packagesCount: packages.length,
            components,
            services,
            packages,
        };
    }
    static async toggleCategoryStatus(categoryId, confirmed = false) {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }
        const newStatus = !category.isActive;
        if (!newStatus && !confirmed) {
            const impact = await this.getDeactivationImpact(categoryId);
            return {
                requiresConfirmation: true,
                impact,
            };
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // 1. Update Category
                await Category.findByIdAndUpdate(categoryId, { isActive: newStatus }, { session });
                // 2. Update Components
                await Component.updateMany({ categoryId }, { isActive: newStatus }, { session });
                // 3. Update Services
                await Service.updateMany({ categoryId }, { isActive: newStatus }, { session });
                // 4. Update Packages
                await Package.updateMany({ categoryId }, { isActive: newStatus }, { session });
            });
            return await Category.findById(categoryId).lean();
        }
        catch (error) {
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async FindCategories(searchTerm, typeFilter, limit = 40, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive == "boolean") {
            query.isActive = isActive;
        }
        if (searchTerm)
            query.$text = { $search: searchTerm };
        if (typeFilter)
            query.type = typeFilter;
        let sortCriteria = {};
        let projection = {};
        if (searchTerm && sortBy === "relevance") {
            projection = { score: { $meta: "textScore" } };
            sortCriteria: {
                score: {
                    $meta: "textScore";
                }
            }
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy == "createdAt")
                sortCriteria["createdAt"] = -1;
        }
        try {
            const [data, total] = await Promise.all([
                Category.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Category.countDocuments(query),
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`Category fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=category.service.js.map