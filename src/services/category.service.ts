import { Category, type ICategory } from "../models/category.model.js";
import { Component } from "../models/component.model.js";

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
    return await category.save();
  }

  static async updateCategory(id: string, updateData: Partial<ICategory>) {
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

    if (!category) throw new Error("Category not found");

    return category;
  }

  static async getCategoryById(id: string) {
    const category = await Category.findById(id).lean();

    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  }

  static async deleteCategory(id: string) {
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

  static async toggleCategoryStatus(id: string) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error("category not found");
    }

    category.isActive = !category.isActive;
    return await category.save();
  }

  static async FindCategories(
    searchTerm?: string,
    typeFilter?: "service" | "product",
    limit: number = 40,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "displayOrder",
    sortOrder: "asc" | "desc" = "asc",
  ) {
    const skip = limit * (page - 1);
    const query: any = {};

    if (typeof isActive == "boolean") {
      query.isActive = isActive;
    }

    if (searchTerm) query.$text = { $search: searchTerm };
    if (typeFilter) query.type = typeFilter;

    let sortCriteria: any = {};
    let projection: any = {};

    if (searchTerm && sortBy === "relevance") {
      projection = { score: { $meta: "textScore" } };
      sortCriteria: {
        score: {
          $meta: "textScore";
        }
      }
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
      if (sortBy == "createdAt") sortCriteria["createdAt"] = -1;
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
    } catch (error: any) {
      throw new Error(`Category fetch failed: ${error.message}`);
    }
  }
}
