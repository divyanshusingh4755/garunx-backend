import { Types } from "mongoose";
import { Component, type IComponent } from "../models/component.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import mongoose from "mongoose";
import { escapeRegex } from "../utils/escapeRegex.js";

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

  static async getDeactivationImpact(componentId: string) {
    const [serviceComponents, pricing] = await Promise.all([
      ServiceComponent.find({ componentId }, { _id: 1, serviceId: 1 }).lean(),

      ServicePricing.find({ componentId, isActive: true }, { _id: 1 }).lean(),
    ]);

    return {
      affectedServicesCount: serviceComponents.length,
      pricingCount: pricing.length,
      serviceComponents,
    };
  }

  static async toggleComponentStatus(
    componentId: string,
    isActive: boolean,
    confirmed = false,
  ) {
    if (!Types.ObjectId.isValid(componentId)) {
      throw new Error("Invalid componentId");
    }

    const component = await Component.findById(componentId);

    if (!component) {
      throw new Error("Component not found");
    }

    // If deactivating → ask confirmation first
    if (!isActive && !confirmed) {
      const impact = await this.getDeactivationImpact(componentId);

      return {
        requiresConfirmation: true,
        impact,
      };
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. Update Component
        await Component.findByIdAndUpdate(
          componentId,
          { isActive },
          { session },
        );

        // 2. Remove/Deactivate from ServiceComponent
        await ServiceComponent.deleteMany({ componentId }, { session });

        // 3. Delete pricing
        await ServicePricing.deleteMany({ componentId }, { session });
      });

      return {
        success: true,
        message: `Component ${isActive ? "activated" : "deactivated"
          } successfully`,
      };
    } finally {
      await session.endSession();
    }
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

    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid categoryId");
      }
      query.categoryId = new Types.ObjectId(categoryId);
    }

    const isTextSearch =
      !!searchTerm?.trim() && searchTerm.trim().length >= 3;

    if (searchTerm?.trim()) {
      const term = searchTerm.trim();

      if (isTextSearch) {
        query.$text = {
          $search: term,
        };
      } else {
        query.name = {
          $regex: `^${escapeRegex(term)}`,
          $options: "i",
        };
      }
    }

    let sortCriteria: any = {};
    let projection: any = {};

    if (isTextSearch && sortBy === "relevance") {
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
