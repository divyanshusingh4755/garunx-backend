import mongoose from "mongoose";
import {
  ComponentItem,
  type IComponentItem,
} from "../models/componentitem.model.js";
import { Types } from "mongoose";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class ComponentItemService {
  static async createComponentItem(payload: Partial<IComponentItem>) {
    try {
      if (!payload.name) throw new Error("Component item name is required");
      const componentitem = await ComponentItem.create(payload);
      return componentitem;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error("Component Item already exists");
      }
      throw new Error(error.message || "Failed to component item");
    }
  }

  static async updateComponentItem(
    componentItemId: string,
    updateData: Partial<IComponentItem>,
  ) {
    try {
      const componentItem = await ComponentItem.findByIdAndUpdate(
        componentItemId,
        {
          $set: updateData,
        },
        { new: true, runValidators: true },
      );

      if (!componentItem) throw new Error("Component Item not found");
      return componentItem;
    } catch (error: any) {
      throw new Error(error.message || "Failed to update component item");
    }
  }

  static async getComponentItemById(componentItemId: string) {
    try {
      const componentItem = await ComponentItem.findById(componentItemId);

      if (!componentItem) throw new Error("Component item not found");
      return componentItem;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get component item by id");
    }
  }

  static async getAllComponentItems(
    searchTerm?: string,
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (typeof isActive === "boolean") query.isActive = isActive;

    const isTextSearch =
      !!searchTerm?.trim() && searchTerm.trim().length > 4;

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
    } catch (error: any) {
      throw new Error(error.message || "Failed to get component Item");
    }
  }

  static async getDeactivationImpact(componentItemId: string) {
    const affected = await ServiceComponent.find(
      {
        "items.itemId": componentItemId,
      },
      {
        _id: 1,
        serviceId: 1,
        componentId: 1,
        items: 1,
      },
    ).lean();

    return {
      affectedServiceComponentsCount: affected.length,
      affected,
    };
  }

  static async updateComponentItemStatus(
    componentItemId: string,
    isActive: boolean,
    confirmed = false,
  ) {
    if (!Types.ObjectId.isValid(componentItemId)) {
      throw new Error("Invalid componentItemId");
    }

    const componentItem = await ComponentItem.findById(componentItemId);

    if (!componentItem) {
      throw new Error("Component Item not found");
    }

    // Confirmation only when deactivating
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
        // Always update the ComponentItem
        await ComponentItem.findByIdAndUpdate(
          componentItemId,
          { isActive },
          { session },
        );

        // Only remove references when deactivating
        if (!isActive) {
          await ServiceComponent.updateMany(
            {
              "items.itemId": new mongoose.Types.ObjectId(componentItemId),
            },
            {
              $pull: {
                items: {
                  itemId: new mongoose.Types.ObjectId(componentItemId),
                },
              },
            },
            { session },
          );
        }
      });

      return {
        success: true,
        message: `Component item ${isActive ? "activated" : "deactivated"} successfully`,
      };
    } catch (err) {
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

export default ComponentItemService;
