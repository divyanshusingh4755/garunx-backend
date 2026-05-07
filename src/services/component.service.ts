import { Types } from "mongoose";
import { Component, type IComponent } from "../models/component.model.js";

export class ComponentService {
  static async createComponent(payload: Partial<IComponent>) {
    try {
      const component = await Component.create(payload);
      return component;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error("Component already exists");
      }
      throw new Error(error.message || "Failed to create component");
    }
  }

  static async updateComponent(
    componentId: string,
    updateData: Partial<IComponent>,
  ) {
    try {
      if (!Types.ObjectId.isValid(componentId)) {
        throw new Error("Invalid componentId");
      }

      const component = await Component.findById(componentId);
      if (!component) throw new Error("Component not found");

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
        if (updateData[key as keyof IComponent] !== undefined) {
          (component as any)[key] = updateData[key as keyof IComponent];
        }
      }

      await component.save();
      return component;
    } catch (error: any) {
      throw new Error(error.message || "Failed to update component");
    }
  }

  static async toggleComponentStatus(componentId: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(componentId)) {
      throw new Error("Invalid componentId");
    }

    const component = await Component.findById(componentId);
    if (!component) throw new Error("Component not found");

    component.isActive = isActive;

    await component.save();

    return {
      success: true,
      message: `Component ${isActive ? "activated" : "deactivated"} successfully`,
    };
  }

  static async getComponentById(componentId: string) {
    if (!Types.ObjectId.isValid(componentId)) {
      throw new Error("Invalid componentId");
    }
    const component = await Component.findById(componentId).lean();
    if (!component) throw new Error("Component not found");

    return component;
  }

  static async FindComponents(
    searchTerm?: string,
    categoryId?: string,
    limit: number = 20,
    page: number = 1,
    isRemovable?: boolean,
    isActive?: boolean,
    isBundled?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = (page - 1) * limit;

    const query: any = {};

    if (typeof isActive === "boolean") query.isActive = isActive;
    if (typeof isRemovable === "boolean") query.isRemovable = isRemovable;
    if (typeof isBundled === "boolean") query.isBundled = isBundled;

    if (searchTerm) query.$text = { $search: searchTerm };
    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid categoryId");
      }
      query.categoryId = new Types.ObjectId(categoryId);
    }

    let sortCriteria: any = {};
    let projection: any = {};

    if (searchTerm && sortBy === "relevance") {
      projection = { score: { $meta: "textScore" } };
      sortCriteria = { score: { $meta: "textScore" } };
    } else {
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
    } catch (error: any) {
      throw new Error(`Component fetch failed: ${error.message}`);
    }
  }
}
