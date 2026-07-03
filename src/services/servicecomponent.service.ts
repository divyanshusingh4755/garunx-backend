import { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import mongoose from "mongoose";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";

export class ServiceComponentService {
  static async bulkUpsertComponents(payload: any) {
    const { serviceId, tierId, components } = payload;

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Array.isArray(components)) {
      throw new Error("Components field must be an array");
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      throw new Error("Service not found");
    }

    const tierExists = service.tiers.some(
      (t) => t.tierId.toString() === tierId,
    );

    if (!tierExists) {
      throw new Error("Tier does not belong to service");
    }

    if (components.length === 0) {
      await ServiceComponent.deleteMany({
        serviceId,
        tierId,
      });

      await service.save();
      await ServiceCascadingEngine.run(serviceId);

      return {
        success: true,
        message: "Components cleared successfully",
      };
    }

    const componentIds = [
      ...new Set(components.map((c: any) => c.componentId)),
    ];

    const componentObjectIds: Types.ObjectId[] = [];

    for (const id of componentIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid componentId: ${id}`);
      }
      componentObjectIds.push(new Types.ObjectId(id));
    }

    const dbComponents = await Component.find({
      _id: { $in: componentObjectIds },
      isActive: true,
    }).select("_id name isBundled");

    if (dbComponents.length !== componentObjectIds.length) {
      throw new Error("One or more components are invalid or inactive");
    }

    const componentMap = new Map(
      dbComponents.map((c) => [c._id.toString(), c]),
    );

    const allItemIds = new Set<string>();

    for (const comp of components) {
      const dbComp = componentMap.get(comp.componentId)!;

      if (dbComp.isBundled) {
        if (!comp.items || comp.items.length === 0) {
          throw new Error(`Component ${dbComp.name} requires items`);
        }

        comp.items.forEach((id: string) => allItemIds.add(id));
      } else {
        if (comp.items && comp.items.length > 0) {
          throw new Error(`Component ${dbComp.name} is not bundled`);
        }
      }
    }

    const itemObjectIds = Array.from(allItemIds).map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid itemId: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const dbItems = await ComponentItem.find({
      _id: { $in: itemObjectIds },
      isActive: true,
    }).select("_id name");

    if (dbItems.length !== itemObjectIds.length) {
      throw new Error("One or more component items are invalid");
    }

    const itemMap = new Map(dbItems.map((i) => [i._id.toString(), i]));

    const bulkOps: any[] = [];

    for (const comp of components) {
      const dbComp = componentMap.get(comp.componentId)!;

      let formattedItems: any[] = [];

      if (dbComp.isBundled) {
        const uniqueItemIds = [...new Set(comp.items)];

        formattedItems = uniqueItemIds.map((itemId) => {
          const id = itemId as string;
          const item = itemMap.get(id)!;
          return {
            itemId: item._id,
            name: item.name,
          };
        });
      }

      bulkOps.push({
        updateOne: {
          filter: {
            serviceId,
            tierId,
            componentId: comp.componentId,
          },
          update: {
            $set: {
              name: dbComp.name,
              isRequired: !!comp.isRequired,
              items: dbComp.isBundled ? formattedItems : [],
            },
          },
          upsert: true,
        },
      });
    }

    const newComponentIds = components.map((c: any) => c.componentId);

    await ServiceComponent.deleteMany({
      serviceId,
      tierId,
      componentId: { $nin: newComponentIds },
    });

    if (bulkOps.length > 0) {
      await ServiceComponent.bulkWrite(bulkOps);
    }

    await service.save();

    await ServiceCascadingEngine.run(serviceId);

    return {
      success: true,
      message: "Components assigned successfully",
    };
  }

  static async replaceComponents(payload: any) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { serviceId, tierId, components } = payload;

      if (!Types.ObjectId.isValid(serviceId)) {
        throw new Error("Invalid serviceId");
      }

      if (!Types.ObjectId.isValid(tierId)) {
        throw new Error("Invalid tierId");
      }

      if (!Array.isArray(components)) {
        throw new Error("Components field must be an array");
      }

      const service = await Service.findById(serviceId).session(session);

      if (!service) throw new Error("Service not found");

      const tierExists = service.tiers.some(
        (t) => t.tierId.toString() === tierId,
      );

      if (!tierExists) {
        throw new Error("Tier does not belong to service");
      }

      if (components.length === 0) {
        await ServiceComponent.deleteMany({
          serviceId,
          tierId,
        }).session(session);

        await service.save({ session });
        await session.commitTransaction();
        session.endSession();

        await ServiceCascadingEngine.run(serviceId);

        return {
          success: true,
          message: "Components cleared successfully",
        };
      }

      const componentIds: string[] = [
        ...new Set<string>(components.map((c: any) => c.componentId)),
      ];

      const componentObjectIds = componentIds.map((id: string) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid componentId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      const dbComponents = await Component.find({
        _id: { $in: componentObjectIds },
        isActive: true,
      })
        .select("_id name isBundled")
        .session(session);

      if (dbComponents.length !== componentObjectIds.length) {
        throw new Error("Invalid or inactive components");
      }

      const componentMap = new Map(
        dbComponents.map((c) => [c._id.toString(), c]),
      );

      const allItemIds = new Set<string>();

      for (const comp of components) {
        const dbComp = componentMap.get(comp.componentId)!;

        if (dbComp.isBundled) {
          if (!comp.items || comp.items.length === 0) {
            throw new Error(`Component ${dbComp.name} requires items`);
          }

          comp.items.forEach((id: string) => allItemIds.add(id));
        } else {
          if (comp.items?.length) {
            throw new Error(`Component ${dbComp.name} should not have items`);
          }
        }
      }

      const itemObjectIds = Array.from(allItemIds).map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid itemId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      const dbItems = await ComponentItem.find({
        _id: { $in: itemObjectIds },
        isActive: true,
      })
        .select("_id name")
        .session(session);

      if (dbItems.length !== itemObjectIds.length) {
        throw new Error("Invalid component items");
      }

      const itemMap = new Map(dbItems.map((i) => [i._id.toString(), i]));

      const docs = components.map((comp: any) => {
        const dbComp = componentMap.get(comp.componentId)!;

        let formattedItems: any[] = [];

        if (dbComp.isBundled) {
          const uniqueItemIds = [...new Set(comp.items)];

          formattedItems = uniqueItemIds.map((id) => {
            const itemId = id as string;
            const item = itemMap.get(itemId)!;
            return {
              itemId: item._id,
              name: item.name,
            };
          });
        }

        return {
          name: dbComp.name,
          serviceId,
          tierId,
          componentId: comp.componentId,
          isRequired: !!comp.isRequired,
          items: formattedItems,
        };
      });

      await ServiceComponent.deleteMany({
        serviceId,
        tierId,
      }).session(session);

      await ServiceComponent.insertMany(docs, { session });
      await service.save({ session });
      await session.commitTransaction();
      session.endSession();

      await ServiceCascadingEngine.run(serviceId);

      return {
        success: true,
        message: "Components replaced successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async getComponentsByServiceAndTier(
    serviceId: string,
    tierId: string,
  ) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      throw new Error("Service not found");
    }

    const tierExists = service.tiers.some(
      (t) => t.tierId.toString() === tierId,
    );

    if (!tierExists) {
      throw new Error("Tier does not belong to service");
    }

    const components = await ServiceComponent.find({
      serviceId,
      tierId,
    })
      .select("componentId name isRequired items")
      .lean();

    return components.map((c) => ({
      componentId: c.componentId,
      name: c.name,
      isRequired: c.isRequired,
      items: c.items || [],
    }));
  }

  static async patchComponent(payload: any) {
    const { serviceId, tierId, componentId, isRequired, name, items } = payload;

    if (!Types.ObjectId.isValid(serviceId))
      throw new Error("Invalid serviceId");
    if (!Types.ObjectId.isValid(tierId)) throw new Error("Invalid tierId");
    if (!Types.ObjectId.isValid(componentId))
      throw new Error("Invalid componentId");

    const service = await Service.findById(serviceId);
    if (!service) throw new Error("Service not found");

    const tierExists = service.tiers.some(
      (t) => t.tierId.toString() === tierId,
    );
    if (!tierExists) throw new Error("Tier not found in service");

    const component = await ServiceComponent.findOne({
      serviceId,
      tierId,
      componentId,
    });

    if (!component) {
      throw new Error("Component not found in this service tier");
    }

    const updateData: any = {};

    if (typeof isRequired === "boolean") {
      updateData.isRequired = isRequired;
    }

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (items !== undefined) {
      const dbComponent = await Component.findById(componentId).lean();

      if (!dbComponent) throw new Error("Invalid base component");

      if (!dbComponent.isBundled && items.length > 0) {
        throw new Error("Non-bundled component cannot have items");
      }

      const itemIds = [
        ...new Set(
          items.map((i: any) => (typeof i === "string" ? i : i.itemId)),
        ),
      ];

      const dbItems = await ComponentItem.find({
        _id: { $in: itemIds as any[] },
        isActive: true,
      }).select("_id name");

      if (dbItems.length !== itemIds.length) {
        throw new Error("Invalid component items");
      }

      updateData.items = dbItems.map((i) => ({
        itemId: i._id,
        name: i.name,
      }));
    }

    await ServiceComponent.updateOne(
      { serviceId, tierId, componentId },
      { $set: updateData },
    );

    await ServiceCascadingEngine.run(serviceId);

    return {
      success: true,
      message: "Component updated successfully",
    };
  }
}
