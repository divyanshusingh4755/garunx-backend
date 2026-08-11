import mongoose, { Types } from "mongoose";
import { Category, type ICategory } from "../models/category.model.js";
import { Component } from "../models/component.model.js";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class CategoryService {
  static async createCategory(categoryData: Partial<ICategory>) {
    if (!categoryData.value) {
      throw new Error("Category value is required");
    }

    const existingCategory = await Category.findOne({
      value: categoryData.value,
    });

    if (existingCategory) {
      throw new Error(
        `Category with value '${categoryData.value}' already exists`,
      );
    }

    const category = new Category(categoryData);

    return category.save();
  }

  static async updateCategory(id: string, updateData: Partial<ICategory>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid category ID");
    }

    if (updateData.value) {
      const existing = await Category.findOne({
        value: updateData.value,
        _id: { $ne: id },
      });

      if (existing) {
        throw new Error(
          `Category with value '${updateData.value}' already exists`,
        );
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  }

  static async getCategoryById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid category ID");
    }

    const category = await Category.findById(id).lean();

    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  }

  static async deleteCategory(id: string) {
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
  }

  static async getDeactivationImpact(categoryId: string) {
    const [components, services, packages] = await Promise.all([
      Component.find(
        { categoryId, isActive: true },
        { _id: 1, name: 1 },
      ).lean(),

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

  static async toggleCategoryStatus(categoryId: string, confirmed = false) {
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

      const hasImpact =
        impact.componentsCount > 0 ||
        impact.servicesCount > 0 ||
        impact.packagesCount > 0;

      if (hasImpact) {
        return {
          requiresConfirmation: true as const,
          impact,
        };
      }
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Category.findByIdAndUpdate(
          categoryId,
          { isActive: newStatus },
          { session, runValidators: true },
        );

        if (!newStatus) {
          await Promise.all([
            Component.updateMany(
              { categoryId },
              { isActive: false },
              { session },
            ),

            Service.updateMany(
              { categoryId },
              { isActive: false },
              { session },
            ),

            Package.updateMany(
              { categoryId },
              { isActive: false },
              { session },
            ),
          ]);
        }
      });

      const updatedCategory = await Category.findById(categoryId).lean();

      if (!updatedCategory) {
        throw new Error("Category not found");
      }

      return {
        ...updatedCategory,
        requiresConfirmation: false as const,
      };
    } finally {
      await session.endSession();
    }
  }

  static async findCategories(
    searchTerm?: string,
    typeFilter?: "service" | "product",
    limit: number = 40,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "displayOrder",
    sortOrder: "asc" | "desc" = "asc",
  ) {
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 40;

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;

    const skip = safeLimit * (safePage - 1);
    const query: Record<string, any> = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    if (typeFilter) {
      query.type = typeFilter;
    }

    const trimmedSearchTerm = searchTerm?.trim();
    const isTextSearch =
      Boolean(trimmedSearchTerm) && trimmedSearchTerm!.length > 4;

    if (trimmedSearchTerm) {
      if (isTextSearch) {
        query.$text = {
          $search: trimmedSearchTerm,
        };
      } else {
        query.$or = [
          {
            label: {
              $regex: `^${escapeRegex(trimmedSearchTerm)}`,
              $options: "i",
            },
          },
          {
            value: {
              $regex: `^${escapeRegex(trimmedSearchTerm)}`,
              $options: "i",
            },
          },
        ];
      }
    }

    const allowedSortFields = new Set([
      "label",
      "value",
      "type",
      "displayOrder",
      "isActive",
      "createdAt",
      "updatedAt",
      "relevance",
    ]);

    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "displayOrder";

    let sortCriteria: Record<string, any> = {};
    let projection: Record<string, any> = {};

    if (isTextSearch && safeSortBy === "relevance") {
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
    } else {
      const field = safeSortBy === "relevance" ? "displayOrder" : safeSortBy;

      sortCriteria[field] = sortOrder === "desc" ? -1 : 1;

      if (field !== "createdAt") {
        sortCriteria.createdAt = -1;
      }
    }

    try {
      const [data, total] = await Promise.all([
        Category.find(query, projection)
          .sort(sortCriteria)
          .skip(skip)
          .limit(safeLimit)
          .lean(),

        Category.countDocuments(query),
      ]);

      return {
        data,
        total,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error: any) {
      throw new Error(`Category fetch failed: ${error.message}`);
    }
  }
}
