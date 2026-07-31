import mongoose, {
  Types,
  type ClientSession,
} from "mongoose";
import { Service } from "../models/service.model.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import {
  ServiceComponent,
  type IServiceComponentItem,
} from "../models/servicecomponent.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";

type ComponentInput = {
  componentId: string;
  isRequired?: boolean;
  items?: Array<string | { itemId: string }>;
};

type ComponentPayload = {
  serviceId: string;
  tierId: string;
  components: ComponentInput[];
};

type PatchPayload = {
  serviceId: string;
  tierId: string;
  componentId: string;
  isRequired?: boolean;
  name?: string;
  items?: Array<string | { itemId: string }>;
};

const createHttpError = (
  message: string,
  statusCode: number,
) => {
  const error = new Error(message) as Error & {
    statusCode: number;
  };

  error.statusCode = statusCode;
  return error;
};

export class ServiceComponentService {
  private static normalizeItemIds(
    items: Array<string | { itemId: string }> = [],
  ) {
    return [
      ...new Set(
        items.map((item) =>
          typeof item === "string"
            ? item
            : item.itemId,
        ),
      ),
    ];
  }

  private static async validateServiceTier(
    serviceId: string,
    tierId: string,
    session?: ClientSession,
  ) {
    const query = Service.findById(serviceId)
      .select("_id tiers");

    if (session) {
      query.session(session);
    }

    const service = await query;

    if (!service) {
      throw createHttpError(
        "Service not found",
        404,
      );
    }

    const tierExists = service.tiers.some(
      (tier) =>
        tier.tierId.toString() === tierId,
    );

    if (!tierExists) {
      throw createHttpError(
        "Tier does not belong to service",
        400,
      );
    }

    return service;
  }

  private static async prepareComponents(
    components: ComponentInput[],
    session?: ClientSession,
  ) {
    const componentIds = [
      ...new Set(
        components.map(
          (component) => component.componentId,
        ),
      ),
    ];

    if (
      componentIds.length !== components.length
    ) {
      throw createHttpError(
        "Duplicate componentId values are not allowed",
        400,
      );
    }

    const objectIds = componentIds.map(
      (id) => new Types.ObjectId(id),
    );

    const componentQuery = Component.find({
      _id: {
        $in: objectIds,
      },
      isActive: true,
    }).select(
      "_id name description isBundled",
    );

    if (session) {
      componentQuery.session(session);
    }

    const dbComponents =
      await componentQuery.lean();

    if (
      dbComponents.length !==
      objectIds.length
    ) {
      throw createHttpError(
        "One or more components are invalid or inactive",
        400,
      );
    }

    const componentMap = new Map(
      dbComponents.map((component) => [
        component._id.toString(),
        component,
      ]),
    );

    const allItemIds = new Set<string>();

    for (const component of components) {
      const dbComponent =
        componentMap.get(
          component.componentId,
        );

      if (!dbComponent) {
        throw createHttpError(
          "Invalid component",
          400,
        );
      }

      const itemIds =
        this.normalizeItemIds(
          component.items,
        );

      if (
        dbComponent.isBundled &&
        itemIds.length === 0
      ) {
        throw createHttpError(
          `Component ${dbComponent.name} requires items`,
          400,
        );
      }

      if (
        !dbComponent.isBundled &&
        itemIds.length > 0
      ) {
        throw createHttpError(
          `Component ${dbComponent.name} is not bundled`,
          400,
        );
      }

      for (const itemId of itemIds) {
        allItemIds.add(itemId);
      }
    }

    const itemObjectIds = [
      ...allItemIds,
    ].map(
      (id) => new Types.ObjectId(id),
    );

    const itemQuery =
      ComponentItem.find({
        _id: {
          $in: itemObjectIds,
        },
        isActive: true,
      }).select("_id name");

    if (session) {
      itemQuery.session(session);
    }

    const dbItems =
      await itemQuery.lean();

    if (
      dbItems.length !==
      itemObjectIds.length
    ) {
      throw createHttpError(
        "One or more component items are invalid or inactive",
        400,
      );
    }

    const itemMap = new Map(
      dbItems.map((item) => [
        item._id.toString(),
        item,
      ]),
    );

    return components.map((component) => {
      const dbComponent =
        componentMap.get(
          component.componentId,
        )!;

      const formattedItems:
        IServiceComponentItem[] =
        this.normalizeItemIds(
          component.items,
        ).map((itemId) => {
          const item =
            itemMap.get(itemId);

          if (!item) {
            throw createHttpError(
              `Invalid component item: ${itemId}`,
              400,
            );
          }

          return {
            itemId: item._id,
            name: item.name,
          };
        });

      return {
        name: dbComponent.name,
        description:
          dbComponent.description,
        componentId:
          dbComponent._id,
        isRequired:
          component.isRequired ?? false,
        items: formattedItems,
      };
    });
  }

  static async bulkUpsertComponents(
    payload: ComponentPayload,
  ) {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      await this.validateServiceTier(
        payload.serviceId,
        payload.tierId,
        session,
      );

      if (
        payload.components.length === 0
      ) {
        await ServiceComponent.deleteMany(
          {
            serviceId:
              new Types.ObjectId(
                payload.serviceId,
              ),
            tierId:
              new Types.ObjectId(
                payload.tierId,
              ),
          },
          {
            session,
          },
        );

        await session.commitTransaction();

        await ServiceCascadingEngine.run(
          payload.serviceId,
        );

        return {
          success: true,
          message:
            "Components cleared successfully",
        };
      }

      const preparedComponents =
        await this.prepareComponents(
          payload.components,
          session,
        );

      const serviceObjectId =
        new Types.ObjectId(
          payload.serviceId,
        );

      const tierObjectId =
        new Types.ObjectId(
          payload.tierId,
        );

      const selectedComponentIds =
        preparedComponents.map(
          (component) =>
            component.componentId,
        );

      const bulkOperations =
        preparedComponents.map(
          (component) => ({
            updateOne: {
              filter: {
                serviceId:
                  serviceObjectId,
                tierId:
                  tierObjectId,
                componentId:
                  component.componentId,
              },

              update: {
                $set: {
                  name:
                    component.name,
                  description:
                    component.description,
                  isRequired:
                    component.isRequired,
                  items:
                    component.items,
                },
              },

              upsert: true,
            },
          }),
        );

      await ServiceComponent.bulkWrite(
        bulkOperations,
        {
          session,
        },
      );

      await ServiceComponent.deleteMany(
        {
          serviceId: serviceObjectId,
          tierId: tierObjectId,
          componentId: {
            $nin: selectedComponentIds,
          },
        },
        {
          session,
        },
      );

      await session.commitTransaction();

      await ServiceCascadingEngine.run(
        payload.serviceId,
      );

      return {
        success: true,
        message:
          "Components assigned successfully",
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async replaceComponents(
    payload: ComponentPayload,
  ) {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      await this.validateServiceTier(
        payload.serviceId,
        payload.tierId,
        session,
      );

      const preparedComponents =
        payload.components.length > 0
          ? await this.prepareComponents(
              payload.components,
              session,
            )
          : [];

      const serviceObjectId =
        new Types.ObjectId(
          payload.serviceId,
        );

      const tierObjectId =
        new Types.ObjectId(
          payload.tierId,
        );

      await ServiceComponent.deleteMany(
        {
          serviceId: serviceObjectId,
          tierId: tierObjectId,
        },
        {
          session,
        },
      );

      if (
        preparedComponents.length > 0
      ) {
        await ServiceComponent.insertMany(
          preparedComponents.map(
            (component) => ({
              ...component,
              serviceId:
                serviceObjectId,
              tierId:
                tierObjectId,
            }),
          ),
          {
            session,
          },
        );
      }

      await session.commitTransaction();

      await ServiceCascadingEngine.run(
        payload.serviceId,
      );

      return {
        success: true,
        message:
          preparedComponents.length > 0
            ? "Components replaced successfully"
            : "Components cleared successfully",
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getComponentsByServiceAndTier(
    serviceId: string,
    tierId: string,
  ) {
    await this.validateServiceTier(
      serviceId,
      tierId,
    );

    const components =
      await ServiceComponent.find({
        serviceId:
          new Types.ObjectId(serviceId),
        tierId:
          new Types.ObjectId(tierId),
      })
        .select(
          "componentId name description isRequired items",
        )
        .lean();

    return components.map(
      (component) => ({
        componentId:
          component.componentId,
        name: component.name,
        description:
          component.description,
        isRequired:
          component.isRequired,
        items:
          component.items ?? [],
      }),
    );
  }

  static async patchComponent(
    payload: PatchPayload,
  ) {
    await this.validateServiceTier(
      payload.serviceId,
      payload.tierId,
    );

    const filter = {
      serviceId:
        new Types.ObjectId(
          payload.serviceId,
        ),
      tierId:
        new Types.ObjectId(
          payload.tierId,
        ),
      componentId:
        new Types.ObjectId(
          payload.componentId,
        ),
    };

    const serviceComponent =
      await ServiceComponent.findOne(
        filter,
      );

    if (!serviceComponent) {
      throw createHttpError(
        "Component not found in this service tier",
        404,
      );
    }

    const updateData:
      Partial<{
        isRequired: boolean;
        name: string;
        items: IServiceComponentItem[];
      }> = {};

    if (
      payload.isRequired !== undefined
    ) {
      updateData.isRequired =
        payload.isRequired;
    }

    if (payload.name !== undefined) {
      updateData.name =
        payload.name.trim();
    }

    if (payload.items !== undefined) {
      const baseComponent =
        await Component.findById(
          payload.componentId,
        )
          .select(
            "_id name isBundled isActive",
          )
          .lean();

      if (
        !baseComponent ||
        !baseComponent.isActive
      ) {
        throw createHttpError(
          "Invalid or inactive base component",
          400,
        );
      }

      const itemIds =
        this.normalizeItemIds(
          payload.items,
        );

      if (
        baseComponent.isBundled &&
        itemIds.length === 0
      ) {
        throw createHttpError(
          `Component ${baseComponent.name} requires items`,
          400,
        );
      }

      if (
        !baseComponent.isBundled &&
        itemIds.length > 0
      ) {
        throw createHttpError(
          "Non-bundled component cannot have items",
          400,
        );
      }

      const objectIds = itemIds.map(
        (id) => new Types.ObjectId(id),
      );

      const dbItems =
        await ComponentItem.find({
          _id: {
            $in: objectIds,
          },
          isActive: true,
        })
          .select("_id name")
          .lean();

      if (
        dbItems.length !==
        objectIds.length
      ) {
        throw createHttpError(
          "One or more component items are invalid or inactive",
          400,
        );
      }

      updateData.items =
        dbItems.map((item) => ({
          itemId: item._id,
          name: item.name,
        }));
    }

    const updatedComponent =
      await ServiceComponent.findOneAndUpdate(
        filter,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!updatedComponent) {
      throw createHttpError(
        "Component not found in this service tier",
        404,
      );
    }

    await ServiceCascadingEngine.run(
      payload.serviceId,
    );

    return {
      success: true,
      message:
        "Component updated successfully",
      component: updatedComponent,
    };
  }
}
