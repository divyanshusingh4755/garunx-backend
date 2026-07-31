import mongoose, {
  Types,
} from "mongoose";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
import { TaxProfile } from "../models/tax-profile.model.js";

type PopulatedComponent = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
};

type TaxPriceMode =
  | "EXCLUSIVE"
  | "INCLUSIVE";

interface ComponentPricingInput {
  componentId: string;
  price: number;
  taxProfileId?: string | null;
  taxPriceMode?: TaxPriceMode;
}

interface LocationPricingInput {
  locationId: string;
  components: ComponentPricingInput[];
}

interface BulkTierPricingPayload {
  serviceId: string;
  tierId: string;
  pricing: LocationPricingInput[];
}

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

export class ServicePricingService {
  static async bulkUpsertTierPricing(
    payload: BulkTierPricingPayload,
  ) {
    const {
      serviceId,
      tierId,
      pricing,
    } = payload;

    const service = await Service.findById(
      serviceId,
    ).lean();

    if (!service) {
      throw createHttpError(
        "Service not found",
        404,
      );
    }

    const tierExists = service.tiers.some(
      (tier) =>
        tier.tierId.toString() ===
        tierId,
    );

    if (!tierExists) {
      throw createHttpError(
        "Tier does not belong to service",
        400,
      );
    }

    const serviceLocationIds =
      new Set(
        service.locations.map(
          (location) =>
            location.locationId.toString(),
        ),
      );

    const allComponentIds =
      new Set<string>();

    const allTaxProfileIds =
      new Set<string>();

    const locationIdsSeen =
      new Set<string>();

    for (
      const locationPricing
      of pricing
    ) {
      const locationId =
        String(
          locationPricing.locationId,
        );

      if (
        locationIdsSeen.has(locationId)
      ) {
        throw createHttpError(
          `Duplicate location in pricing: ${locationId}`,
          400,
        );
      }

      locationIdsSeen.add(locationId);

      if (
        !serviceLocationIds.has(
          locationId,
        )
      ) {
        throw createHttpError(
          `Location ${locationId} does not belong to service`,
          400,
        );
      }

      const componentIdsSeen =
        new Set<string>();

      for (
        const componentPricing
        of locationPricing.components
      ) {
        const componentId =
          String(
            componentPricing.componentId,
          );

        if (
          componentIdsSeen.has(
            componentId,
          )
        ) {
          throw createHttpError(
            `Duplicate component ${componentId} for location ${locationId}`,
            400,
          );
        }

        componentIdsSeen.add(
          componentId,
        );

        allComponentIds.add(
          componentId,
        );

        if (
          typeof componentPricing.price !==
          "number" ||
          !Number.isFinite(
            componentPricing.price,
          ) ||
          componentPricing.price < 0
        ) {
          throw createHttpError(
            `Invalid price for component ${componentId}`,
            400,
          );
        }

        const taxProfileId =
          componentPricing.taxProfileId;

        if (taxProfileId) {
          allTaxProfileIds.add(
            taxProfileId,
          );
        }

        if (
          componentPricing.taxPriceMode !==
          undefined &&
          componentPricing.taxPriceMode !==
          "EXCLUSIVE" &&
          componentPricing.taxPriceMode !==
          "INCLUSIVE"
        ) {
          throw createHttpError(
            `Invalid taxPriceMode for component ${componentId}`,
            400,
          );
        }
      }
    }

    const componentObjectIds = [
      ...allComponentIds,
    ].map(
      (id) =>
        new Types.ObjectId(id),
    );

    const validComponents =
      await ServiceComponent.find({
        serviceId:
          new Types.ObjectId(serviceId),
        tierId:
          new Types.ObjectId(tierId),
        componentId: {
          $in: componentObjectIds,
        },
      })
        .select("componentId")
        .lean();

    const validComponentSet =
      new Set(
        validComponents.map(
          (component) =>
            component.componentId.toString(),
        ),
      );

    const invalidComponentIds = [
      ...allComponentIds,
    ].filter(
      (componentId) =>
        !validComponentSet.has(
          componentId,
        ),
    );

    if (
      invalidComponentIds.length > 0
    ) {
      throw createHttpError(
        `Components do not belong to this service tier: ${invalidComponentIds.join(", ")}`,
        400,
      );
    }

    const taxProfileIds = [
      ...allTaxProfileIds,
    ];

    if (taxProfileIds.length > 0) {
      const validTaxProfiles =
        await TaxProfile.find({
          _id: {
            $in: taxProfileIds.map(
              (id) =>
                new Types.ObjectId(id),
            ),
          },
          isActive: true,
        })
          .select("_id")
          .lean();

      const validTaxProfileSet =
        new Set(
          validTaxProfiles.map(
            (profile) =>
              profile._id.toString(),
          ),
        );

      const invalidTaxProfileIds =
        taxProfileIds.filter(
          (id) =>
            !validTaxProfileSet.has(
              id,
            ),
        );

      if (
        invalidTaxProfileIds.length > 0
      ) {
        throw createHttpError(
          `Inactive or invalid tax profiles: ${invalidTaxProfileIds.join(", ")}`,
          400,
        );
      }
    }

    const serviceObjectId =
      new Types.ObjectId(serviceId);

    const tierObjectId =
      new Types.ObjectId(tierId);

    const bulkOperations: any[] = [];

    const requestedPairs: Array<{
      locationId: Types.ObjectId;
      componentId: Types.ObjectId;
    }> = [];

    for (
      const locationPricing
      of pricing
    ) {
      const locationObjectId =
        new Types.ObjectId(
          locationPricing.locationId,
        );

      for (
        const componentPricing
        of locationPricing.components
      ) {
        const componentObjectId =
          new Types.ObjectId(
            componentPricing.componentId,
          );

        const taxProfileId =
          componentPricing.taxProfileId ??
          null;

        const taxPriceMode =
          taxProfileId
            ? componentPricing.taxPriceMode ??
            "EXCLUSIVE"
            : "EXCLUSIVE";

        requestedPairs.push({
          locationId:
            locationObjectId,
          componentId:
            componentObjectId,
        });

        bulkOperations.push({
          updateOne: {
            filter: {
              serviceId:
                serviceObjectId,
              tierId:
                tierObjectId,
              locationId:
                locationObjectId,
              componentId:
                componentObjectId,
            },

            update: {
              $set: {
                price:
                  componentPricing.price,

                taxProfileId:
                  taxProfileId
                    ? new Types.ObjectId(
                      taxProfileId,
                    )
                    : null,

                taxPriceMode,
                isActive: true,
              },

              $setOnInsert: {
                serviceId:
                  serviceObjectId,
                tierId:
                  tierObjectId,
                locationId:
                  locationObjectId,
                componentId:
                  componentObjectId,
              },
            },

            upsert: true,
          },
        });
      }
    }

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      await ServicePricing.bulkWrite(
        bulkOperations,
        {
          ordered: true,
          session,
        },
      );

      await ServicePricing.deleteMany(
        {
          serviceId:
            serviceObjectId,
          tierId:
            tierObjectId,
          $nor: requestedPairs,
        },
        {
          session,
        },
      );

      await session.commitTransaction();
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      throw error;
    } finally {
      await session.endSession();
    }

    await ServiceCascadingEngine.run(
      serviceId,
    );

    return {
      success: true,
      message:
        "Pricing updated successfully",
      updatedCount:
        bulkOperations.length,
    };
  }

  static async resolvePricing(
    serviceId: string,
    tierId: string,
    locationId: string,
  ) {
    const service = await Service.findById(
      serviceId,
    ).lean();

    if (!service) {
      throw createHttpError(
        "Service not found",
        404,
      );
    }

    if (!service.isActive) {
      throw createHttpError(
        "Service is inactive",
        400,
      );
    }

    const tier = service.tiers.find(
      (item) =>
        item.tierId.toString() ===
        tierId,
    );

    if (!tier) {
      throw createHttpError(
        "Tier does not belong to service",
        400,
      );
    }

    const location =
      service.locations.find(
        (item) =>
          item.locationId.toString() ===
          locationId,
      );

    if (!location) {
      throw createHttpError(
        "Location does not belong to service",
        400,
      );
    }

    if (!location.isActive) {
      throw createHttpError(
        "Location is inactive for this service",
        400,
      );
    }

    const components =
      await ServiceComponent.find({
        serviceId:
          new Types.ObjectId(serviceId),
        tierId:
          new Types.ObjectId(tierId),
      })
        .populate({
          path: "componentId",
          match: {
            isActive: true,
          },
          select:
            "name description imageUrl isActive",
        })
        .select(
          "componentId isRequired items",
        )
        .lean();

    const pricing =
      await ServicePricing.find({
        serviceId:
          new Types.ObjectId(serviceId),
        tierId:
          new Types.ObjectId(tierId),
        locationId:
          new Types.ObjectId(locationId),
        isActive: true,
      })
        .select(
          "componentId price taxProfileId taxPriceMode",
        )
        .populate({
          path: "taxProfileId",
          match: {
            isActive: true,
          },
          select:
            "name code treatment totalRate isActive",
        })
        .lean();

    const pricingMap = new Map(
      pricing.map(
        (pricingRecord) => [
          pricingRecord.componentId.toString(),
          pricingRecord,
        ],
      ),
    );

    const resolvedComponents =
      components.flatMap(
        (component) => {
          const componentData = component.componentId as unknown as PopulatedComponent | null;

          if (!componentData) {
            return [];
          }

          const componentId =
            componentData._id.toString();

          const pricingRecord =
            pricingMap.get(componentId);

          const taxProfile =
            pricingRecord?.taxProfileId as
            | {
              _id: Types.ObjectId;
              name?: string;
              code?: string;
              treatment?: string;
              totalRate?: number;
              isActive?: boolean;
            }
            | null
            | undefined;

          return [
            {
              componentId:
                componentData._id,

              name:
                componentData.name,

              description:
                componentData.description ??
                "",

              imageUrl:
                componentData.imageUrl ??
                null,

              isRequired:
                component.isRequired,

              price:
                pricingRecord?.price ??
                null,

              isPriceConfigured:
                Boolean(
                  pricingRecord,
                ),

              tax: pricingRecord
                ? {
                  taxProfileId:
                    taxProfile?._id ??
                    null,

                  profileName:
                    taxProfile?.name ??
                    null,

                  profileCode:
                    taxProfile?.code ??
                    null,

                  treatment:
                    taxProfile?.treatment ??
                    null,

                  totalRate:
                    taxProfile?.totalRate ??
                    0,

                  priceMode:
                    taxProfile
                      ? pricingRecord.taxPriceMode
                      : "EXCLUSIVE",

                  isTaxConfigured:
                    Boolean(
                      taxProfile,
                    ),
                }
                : null,

              items:
                component.items ?? [],
            },
          ];
        },
      );

    const requiredComponents =
      resolvedComponents.filter(
        (component) =>
          component.isRequired,
      );

    const optionalComponents =
      resolvedComponents.filter(
        (component) =>
          !component.isRequired,
      );

    const startingPrice =
      requiredComponents.reduce(
        (sum, component) =>
          sum +
          (component.price ?? 0),
        0,
      );

    const isAvailable =
      requiredComponents.length > 0 &&
      requiredComponents.every(
        (component) =>
          component.isPriceConfigured,
      );

    return {
      service: {
        id: service._id,
        name: service.name,
        shortDescription:
          service.shortDescription,
        fullDescription:
          service.fullDescription,
        thumbnailImage:
          service.thumbnailImage,
        bannerImage:
          service.bannerImage,
        serviceReference:
          service.serviceReference,
      },

      tier: {
        id: tier.tierId,
        name: tier.name,
      },

      location: {
        id:
          location.locationId,
        name: location.name,
      },

      components:
        resolvedComponents,

      summary: {
        totalComponents:
          resolvedComponents.length,
        requiredComponentCount:
          requiredComponents.length,
        optionalComponentCount:
          optionalComponents.length,
        startingPrice,
        isAvailable,
      },
    };
  }
}
