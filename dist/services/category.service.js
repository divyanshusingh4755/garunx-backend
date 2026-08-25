import mongoose, { Types } from "mongoose";
import { Category } from "../models/category.model.js";
import { Component } from "../models/component.model.js";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
export class CategoryService {
    static async invalidateCategoryCache(categoryId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.categoryListPattern())
        ];
        if (categoryId) {
            operations.push(RedisCacheService.delete(CacheKeys.categoryDetail(categoryId)));
        }
        await Promise.all(operations);
    }
    static async invalidateCategoryDependents() {
        await Promise.all([
            RedisCacheService.deleteByPattern(CacheKeys.componentListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.componentDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceFullPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageByLocationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageFullPattern()),
        ]);
    }
    static async createCategory(categoryData) {
        if (!categoryData.value) {
            throw new Error("Category value is required");
        }
        const existingCategory = await Category.findOne({ value: categoryData.value });
        if (existingCategory) {
            throw new Error(`Category with value '${categoryData.value}' already exists`);
        }
        const category = new Category(categoryData);
        const savedCategory = await category.save();
        await this.invalidateCategoryCache();
        return savedCategory;
    }
    static async updateCategory(id, updateData) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }
        if (updateData.value) {
            const existing = await Category.findOne({ value: updateData.value, _id: { $ne: id } });
            if (existing) {
                throw new Error(`Category with value '${updateData.value}' already exists`);
            }
        }
        const category = await Category.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!category) {
            throw new Error("Category not found");
        }
        await Promise.all([
            this.invalidateCategoryCache(id),
            this.invalidateCategoryDependents(),
        ]);
        return category;
    }
    static async getCategoryById(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.categoryDetail(id),
            ttlSeconds: CACHE_TTL_SECONDS.CATEGORY_DETAIL,
            loader: async () => {
                const category = await Category.findById(id).lean();
                if (!category) {
                    throw new Error("Category not found");
                }
                return category;
            },
        });
    }
    static async deleteCategory(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }
        const category = await Category.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }
        const [hasComponents, hasServices, hasPackages] = await Promise.all([
            Component.exists({ categoryId: id }),
            Service.exists({ categoryId: id }),
            Package.exists({ categoryId: id }),
        ]);
        if (hasComponents || hasServices || hasPackages) {
            throw new Error("Cannot delete category because it is currently in use");
        }
        await Category.findByIdAndDelete(id);
        await Promise.all([
            this.invalidateCategoryCache(id),
            this.invalidateCategoryDependents(),
        ]);
    }
    static async getDeactivationImpact(categoryId) {
        const [components, services, packages] = await Promise.all([
            Component.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
            Service.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
            Package.find({ categoryId, isActive: true }, { _id: 1, name: 1 }).lean(),
        ]);
        return { componentsCount: components.length, servicesCount: services.length, packagesCount: packages.length, components, services, packages };
    }
    static async toggleCategoryStatus(categoryId, confirmed = false) {
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error("Invalid category ID");
        }
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }
        const newStatus = !category.isActive;
        if (!newStatus && !confirmed) {
            const impact = await this.getDeactivationImpact(categoryId);
            const hasImpact = impact.componentsCount > 0 || impact.servicesCount > 0 || impact.packagesCount > 0;
            if (hasImpact) {
                return { requiresConfirmation: true, impact };
            }
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await Category.findByIdAndUpdate(categoryId, { isActive: newStatus }, { session, runValidators: true });
                if (!newStatus) {
                    await Promise.all([
                        Component.updateMany({ categoryId }, { isActive: false }, { session }),
                        Service.updateMany({ categoryId }, { isActive: false }, { session }),
                        Package.updateMany({ categoryId }, { isActive: false }, { session }),
                    ]);
                }
            });
            const updatedCategory = await Category.findById(categoryId).lean();
            if (!updatedCategory) {
                throw new Error("Category not found");
            }
            await Promise.all([
                this.invalidateCategoryCache(categoryId),
                this.invalidateCategoryDependents(),
            ]);
            return { ...updatedCategory, requiresConfirmation: false };
        }
        finally {
            await session.endSession();
        }
    }
    static async findCategories(searchTerm, typeFilter, limit = 40, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 40;
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const trimmedSearchTerm = searchTerm?.trim();
        const isTextSearch = Boolean(trimmedSearchTerm && trimmedSearchTerm.length > 4);
        const allowedSortFields = new Set(["label", "value", "type", "displayOrder", "isActive", "createdAt", "updatedAt", "relevance"]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "displayOrder";
        const effectiveSortBy = safeSortBy === "relevance" && !isTextSearch ? "displayOrder" : safeSortBy;
        const cacheKey = CacheKeys.categoryList({ searchTerm: trimmedSearchTerm, typeFilter, limit: safeLimit, page: safePage, isActive, sortBy: effectiveSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.CATEGORY_LIST,
            loader: async () => {
                const skip = safeLimit * (safePage - 1);
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                if (typeFilter) {
                    query.type = typeFilter;
                }
                if (trimmedSearchTerm) {
                    if (isTextSearch) {
                        query.$text = { $search: trimmedSearchTerm };
                    }
                    else {
                        query.$or = [
                            { label: { $regex: `^${escapeRegex(trimmedSearchTerm)}`, $options: "i" } },
                            { value: { $regex: `^${escapeRegex(trimmedSearchTerm)}`, $options: "i" } },
                        ];
                    }
                }
                let sortCriteria = {};
                let projection = {};
                if (isTextSearch && effectiveSortBy === "relevance") {
                    projection = { score: { $meta: "textScore" } };
                    sortCriteria = { score: { $meta: "textScore" } };
                }
                else {
                    sortCriteria[effectiveSortBy] = sortOrder === "desc" ? -1 : 1;
                    if (effectiveSortBy !== "createdAt") {
                        sortCriteria.createdAt = -1;
                    }
                }
                try {
                    const [data, total] = await Promise.all([
                        Category.find(query, projection).sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                        Category.countDocuments(query),
                    ]);
                    return { data, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
                }
                catch (error) {
                    throw new Error(`Category fetch failed: ${error.message}`);
                }
            },
        });
    }
    static async exportCategoriesToCsv(categoryIds) {
        const uniqueCategoryIds = [...new Set(categoryIds)];
        const categories = await Category.find({ _id: { $in: uniqueCategoryIds } })
            .select(["_id", "label", "value", "type", "description", "image", "displayOrder", "isActive"].join(" ")).lean();
        if (categories.length === 0) {
            throw new Error("No categories found for export");
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["Category ID", "Label", "Value", "Type", "Description", "Image", "Display Order", "Active"];
        const rows = categories.map((category) => [category._id.toString(), category.label, category.value, category.type, category.description ?? "", category.image ?? "", category.displayOrder, category.isActive]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: categories.length };
    }
}
//# sourceMappingURL=category.service.js.map