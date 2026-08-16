import mongoose, { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
import { TaxProfile } from "../models/tax-profile.model.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { ComponentItem } from "../models/componentitem.model.js";

type PopulatedComponent = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
};

type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";

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

const createHttpError = (message: string, statusCode: number) => {
  const error = new Error(message) as Error & {
    statusCode: number;
  };

  error.statusCode = statusCode;
  return error;
};

export class ServicePricingService {
  private static async invalidatePricingCache(
    serviceId:
      string,
  ): Promise<void> {
    await Promise.all([
      /*
       * Direct pricing responses.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys
          .serviceResolvedPricingByServicePattern(
            serviceId,
          ),
      ),

      /*
       * getFullService()
       * includes ServicePricing.
       */
      RedisCacheService.delete(
        CacheKeys.serviceFull(
          serviceId,
        ),
      ),

      /*
       * City-specific full service
       * also includes ServicePricing.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys
          .serviceFullByCitiesPattern(
            serviceId,
          ),
      ),

      /*
       * Cascading engine may change
       * startingPrice / isComplete.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys.serviceListPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys
          .serviceByLocationListPattern(),
      ),

      /*
       * Detail contains startingPrice /
       * isComplete as well.
       */
      RedisCacheService.delete(
        CacheKeys.serviceDetail(
          serviceId,
        ),
      ),
    ]);
  }

  static async bulkUpsertTierPricing(
    payload: BulkTierPricingPayload,
  ) {
    const {
      serviceId,
      tierId,
      pricing,
    } = payload;

    const serviceObjectId =
      new Types.ObjectId(serviceId);

    const tierObjectId =
      new Types.ObjectId(tierId);

    /*
     * -------------------------------------------------
     * 1. Validate service configuration
     * -------------------------------------------------
     */
    const service =
      await Service.findById(
        serviceObjectId,
      ).lean();

    if (!service) {
      throw createHttpError(
        "Service not found",
        404,
      );
    }

    const tierExists =
      service.tiers.some(
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

    /*
     * Pricing should only be configured
     * for ACTIVE service locations.
     */
    const serviceLocationIds =
      new Set(
        service.locations
          .filter(
            (location) =>
              location.isActive,
          )
          .map(
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

    /*
     * -------------------------------------------------
     * 2. Validate request structure/business rules
     * -------------------------------------------------
     */
    for (
      const locationPricing of pricing
    ) {
      const locationId =
        String(
          locationPricing.locationId,
        );

      if (
        locationIdsSeen.has(
          locationId,
        )
      ) {
        throw createHttpError(
          `Duplicate location in pricing: ${locationId}`,
          400,
        );
      }

      locationIdsSeen.add(
        locationId,
      );

      if (
        !serviceLocationIds.has(
          locationId,
        )
      ) {
        throw createHttpError(
          `Location ${locationId} does not belong to this service or is inactive`,
          400,
        );
      }

      const componentIdsSeen =
        new Set<string>();

      for (
        const componentPricing of
        locationPricing.components
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

        if (
          componentPricing.taxProfileId
        ) {
          allTaxProfileIds.add(
            componentPricing.taxProfileId,
          );
        }

        if (
          componentPricing
            .taxPriceMode !==
          undefined &&
          componentPricing
            .taxPriceMode !==
          "EXCLUSIVE" &&
          componentPricing
            .taxPriceMode !==
          "INCLUSIVE"
        ) {
          throw createHttpError(
            `Invalid taxPriceMode for component ${componentId}`,
            400,
          );
        }
      }
    }

    /*
     * -------------------------------------------------
     * 3. Verify ServiceComponent + base Component status
     * -------------------------------------------------
     */

    const componentObjectIds =
      [...allComponentIds].map(
        (id) =>
          new Types.ObjectId(id),
      );

    const validComponents =
      await ServiceComponent.find({
        serviceId:
          serviceObjectId,

        tierId:
          tierObjectId,

        componentId: {
          $in:
            componentObjectIds,
        },
      })
        .populate({
          path:
            "componentId",

          match: {
            isActive:
              true,
          },

          select:
            "_id isActive",
        })
        .select(
          "componentId",
        )
        .lean();

    const validComponentSet =
      new Set(
        validComponents
          .filter(
            (record) =>
              record.componentId,
          )
          .map(
            (record) => {
              const component =
                record.componentId as unknown as {
                  _id: Types.ObjectId;
                };

              return component
                ._id
                .toString();
            },
          ),
      );

    const invalidComponentIds =
      [...allComponentIds].filter(
        (componentId) =>
          !validComponentSet.has(
            componentId,
          ),
      );

    if (
      invalidComponentIds.length > 0
    ) {
      throw createHttpError(
        `Components are invalid, inactive, or do not belong to this service tier: ${invalidComponentIds.join(", ")}`,
        400,
      );
    }

    /*
     * -------------------------------------------------
     * 4. Build bulk operations
     * -------------------------------------------------
     */

    const bulkOperations: any[] =
      [];

    for (
      const locationPricing of pricing
    ) {
      const locationObjectId =
        new Types.ObjectId(
          locationPricing.locationId,
        );

      for (
        const componentPricing of
        locationPricing.components
      ) {
        const componentObjectId =
          new Types.ObjectId(
            componentPricing.componentId,
          );

        const taxProfileId =
          componentPricing
            .taxProfileId ??
          null;

        const taxPriceMode =
          taxProfileId
            ? (
              componentPricing
                .taxPriceMode ??
              "EXCLUSIVE"
            )
            : "EXCLUSIVE";

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
                  componentPricing
                    .price,

                taxProfileId:
                  taxProfileId
                    ? new Types.ObjectId(
                      taxProfileId,
                    )
                    : null,

                taxPriceMode,

                isActive:
                  true,
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

            upsert:
              true,
          },
        });
      }
    }

    /*
     * -------------------------------------------------
     * 5. Transaction
     * -------------------------------------------------
     */

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(
        async () => {
          /*
           * Validate TaxProfiles INSIDE
           * the pricing transaction.
           */
          const taxProfileIds =
            [...allTaxProfileIds];

          for (
            const taxProfileId of
            taxProfileIds
          ) {
            const lockResult =
              await TaxProfile.updateOne(
                {
                  _id:
                    new Types.ObjectId(
                      taxProfileId,
                    ),

                  isActive:
                    true,
                },

                {
                  $inc: {
                    pricingRevision:
                      1,
                  },
                },

                {
                  session,
                },
              );

            if (
              lockResult.matchedCount !==
              1
            ) {
              throw createHttpError(
                `Tax profile ${taxProfileId} is invalid or inactive`,
                400,
              );
            }
          }

          await ServicePricing.bulkWrite(
            bulkOperations,
            {
              ordered:
                true,

              session,
            },
          );

          /*
           * IMPORTANT:
           *
           * This is BULK UPSERT,
           * not replacement.
           *
           * DO NOT delete pricing records
           * that weren't included in this request.
           */
        },
      );
    } finally {
      await session.endSession();
    }

    /*
     * Run derived-state calculation only after
     * the pricing transaction committed.
     */
    await ServiceCascadingEngine.run(
      serviceId,
    );

    await this.invalidatePricingCache(
      serviceId,
    );

    return {
      success:
        true,

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

    const cacheKey =
      CacheKeys.serviceResolvedPricing(
        serviceId,
        tierId,
        locationId,
      );

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .SERVICE_RESOLVED_PRICING,

      loader:
        async () => {
          const service = await Service.findById(serviceId).lean();

          if (!service) {
            throw createHttpError("Service not found", 404);
          }

          if (!service.isActive) {
            throw createHttpError("Service is inactive", 400);
          }

          if (!service.isComplete) {
            throw createHttpError(
              "Service configuration is incomplete",
              400,
            );
          }

          const tier = service.tiers.find(
            (item) => item.tierId.toString() === tierId,
          );

          if (!tier) {
            throw createHttpError("Tier does not belong to service", 400);
          }

          const location = service.locations.find(
            (item) => item.locationId.toString() === locationId,
          );

          if (!location) {
            throw createHttpError("Location does not belong to service", 400);
          }

          if (!location.isActive) {
            throw createHttpError("Location is inactive for this service", 400);
          }

          const components = await ServiceComponent.find({
            serviceId: new Types.ObjectId(serviceId),
            tierId: new Types.ObjectId(tierId),
          })
            .populate({
              path: "componentId",
              match: {
                isActive: true,
              },
              select: "name description imageUrl isActive",
            })
            .select("componentId isRequired items")
            .lean();

          const pricing = await ServicePricing.find({
            serviceId: new Types.ObjectId(serviceId),
            tierId: new Types.ObjectId(tierId),
            locationId: new Types.ObjectId(locationId),
            isActive: true,
          })
            .select("componentId price taxProfileId taxPriceMode")
            .populate({
              path: "taxProfileId",
              match: {
                isActive: true,
              },
              select: "name code treatment totalRate isActive",
            })
            .lean();

          const itemIds = [
            ...new Set(
              components.flatMap(
                (component) =>
                  (
                    component.items ??
                    []
                  ).map(
                    (item) =>
                      item.itemId.toString(),
                  ),
              ),
            ),
          ];

          const activeItemDocuments =
            itemIds.length > 0
              ? await ComponentItem.find({
                _id: {
                  $in:
                    itemIds.map(
                      (id) =>
                        new Types.ObjectId(
                          id,
                        ),
                    ),
                },

                isActive:
                  true,
              })
                .select(
                  "_id name",
                )
                .lean()
              : [];

          const activeItemMap =
            new Map(
              activeItemDocuments.map(
                (item) => [
                  item._id.toString(),
                  item,
                ],
              ),
            );

          const pricingMap = new Map(
            pricing.map((pricingRecord) => [
              pricingRecord.componentId.toString(),
              pricingRecord,
            ]),
          );

          const resolvedComponents = components.flatMap((component) => {
            const componentData =
              component.componentId as unknown as PopulatedComponent | null;

            if (!componentData) {
              return [];
            }

            const componentId = componentData._id.toString();

            const pricingRecord = pricingMap.get(componentId);

            const taxProfile = pricingRecord?.taxProfileId as
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
                componentId: componentData._id,

                name: componentData.name,

                description: componentData.description ?? "",

                imageUrl: componentData.imageUrl ?? null,

                isRequired: component.isRequired,

                price: pricingRecord?.price ?? null,

                isPriceConfigured: Boolean(pricingRecord),

                tax: pricingRecord
                  ? {
                    taxProfileId: taxProfile?._id ?? null,

                    profileName: taxProfile?.name ?? null,

                    profileCode: taxProfile?.code ?? null,

                    treatment: taxProfile?.treatment ?? null,

                    totalRate: taxProfile?.totalRate ?? 0,

                    priceMode: taxProfile
                      ? pricingRecord.taxPriceMode
                      : "EXCLUSIVE",

                    isTaxConfigured: Boolean(taxProfile),
                  }
                  : null,

                items:
                  (
                    component.items ??
                    []
                  ).flatMap(
                    (item) => {
                      const activeItem =
                        activeItemMap.get(
                          item.itemId.toString(),
                        );

                      if (!activeItem) {
                        return [];
                      }

                      return [
                        {
                          itemId:
                            activeItem._id,

                          name:
                            activeItem.name,
                        },
                      ];
                    },
                  ),
              },
            ];
          });

          const requiredComponents = resolvedComponents.filter(
            (component) => component.isRequired,
          );

          const optionalComponents = resolvedComponents.filter(
            (component) => !component.isRequired,
          );

          const startingPrice = requiredComponents.reduce(
            (sum, component) => sum + (component.price ?? 0),
            0,
          );

          const isAvailable =
            requiredComponents.length > 0 &&
            requiredComponents.every((component) => component.isPriceConfigured);

          return {
            service: {
              id: service._id,
              name: service.name,
              shortDescription: service.shortDescription,
              fullDescription: service.fullDescription,
              thumbnailImage: service.thumbnailImage,
              bannerImage: service.bannerImage,
              serviceReference: service.serviceReference,
            },

            tier: {
              id: tier.tierId,
              name: tier.name,
            },

            location: {
              id: location.locationId,
              name: location.name,
            },

            components: resolvedComponents,

            summary: {
              totalComponents: resolvedComponents.length,
              requiredComponentCount: requiredComponents.length,
              optionalComponentCount: optionalComponents.length,
              startingPrice,
              isAvailable,
            },
          };
        }
    });
  }
}
