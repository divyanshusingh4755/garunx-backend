import { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
import { TaxProfile } from "../models/tax-profile.model.js";

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

export class ServicePricingService {
  static async bulkUpsertTierPricing(
    payload: BulkTierPricingPayload,
  ) {
    const {
      serviceId,
      tierId,
      pricing,
    } = payload;

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (
      !Array.isArray(pricing) ||
      pricing.length === 0
    ) {
      throw new Error(
        "Pricing array is required",
      );
    }

    const service = await Service.findById(
      serviceId,
    ).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    const tierExists = service.tiers.some(
      (tier) =>
        tier.tierId.toString() === tierId,
    );

    if (!tierExists) {
      throw new Error(
        "Tier does not belong to service",
      );
    }

    const serviceLocationIds = new Set(
      service.locations.map((location) =>
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
     * First pass:
     * validate request structure and collect IDs.
     */
    for (const locationPricing of pricing) {
      const locationId =
        String(locationPricing.locationId);

      if (
        !Types.ObjectId.isValid(locationId)
      ) {
        throw new Error(
          `Invalid locationId: ${locationId}`,
        );
      }

      if (
        locationIdsSeen.has(locationId)
      ) {
        throw new Error(
          `Duplicate location in pricing: ${locationId}`,
        );
      }

      locationIdsSeen.add(locationId);

      if (
        !serviceLocationIds.has(locationId)
      ) {
        throw new Error(
          `Location ${locationId} does not belong to service`,
        );
      }

      if (
        !Array.isArray(
          locationPricing.components,
        ) ||
        locationPricing.components.length ===
        0
      ) {
        throw new Error(
          `Location ${locationId} must contain components`,
        );
      }

      const componentIdsSeen =
        new Set<string>();

      for (
        const componentPricing of
        locationPricing.components
      ) {
        const componentId = String(
          componentPricing.componentId,
        );

        if (
          !Types.ObjectId.isValid(
            componentId,
          )
        ) {
          throw new Error(
            `Invalid componentId: ${componentId}`,
          );
        }

        if (
          componentIdsSeen.has(componentId)
        ) {
          throw new Error(
            `Duplicate component ${componentId} for location ${locationId}`,
          );
        }

        componentIdsSeen.add(componentId);
        allComponentIds.add(componentId);

        if (
          typeof componentPricing.price !==
          "number" ||
          !Number.isFinite(
            componentPricing.price,
          ) ||
          componentPricing.price < 0
        ) {
          throw new Error(
            `Invalid price for component ${componentId}`,
          );
        }

        const taxProfileId =
          componentPricing.taxProfileId;

        if (taxProfileId) {
          if (
            !Types.ObjectId.isValid(
              taxProfileId,
            )
          ) {
            throw new Error(
              `Invalid taxProfileId: ${taxProfileId}`,
            );
          }

          allTaxProfileIds.add(
            taxProfileId,
          );
        }

        const taxPriceMode =
          componentPricing.taxPriceMode ??
          "EXCLUSIVE";

        if (
          taxPriceMode !== "EXCLUSIVE" &&
          taxPriceMode !== "INCLUSIVE"
        ) {
          throw new Error(
            `Invalid taxPriceMode for component ${componentId}`,
          );
        }
      }
    }

    /*
     * Validate that components belong to
     * this service and tier.
     */
    const componentObjectIds =
      Array.from(allComponentIds).map(
        (id) => new Types.ObjectId(id),
      );

    const validComponents =
      await ServiceComponent.find({
        serviceId,
        tierId,
        componentId: {
          $in: componentObjectIds,
        },
      })
        .select("componentId")
        .lean();

    const validComponentSet = new Set(
      validComponents.map((component) =>
        component.componentId.toString(),
      ),
    );

    const invalidComponentIds =
      Array.from(allComponentIds).filter(
        (componentId) =>
          !validComponentSet.has(
            componentId,
          ),
      );

    if (invalidComponentIds.length > 0) {
      throw new Error(
        `Components do not belong to this service tier: ${invalidComponentIds.join(
          ", ",
        )}`,
      );
    }

    /*
     * Validate all tax profiles in one query.
     */
    const taxProfileIds =
      Array.from(allTaxProfileIds);

    if (taxProfileIds.length > 0) {
      const now = new Date();

      const validTaxProfiles =
        await TaxProfile.find({
          _id: {
            $in: taxProfileIds.map(
              (id) =>
                new Types.ObjectId(id),
            ),
          },

          isActive: true
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
            !validTaxProfileSet.has(id),
        );

      if (
        invalidTaxProfileIds.length > 0
      ) {
        throw new Error(
          `Inactive, expired, future, or invalid tax profiles: ${invalidTaxProfileIds.join(
            ", ",
          )}`,
        );
      }
    }

    const bulkOps: any[] = [];
    const requestedPricingKeys =
      new Set<string>();

    /*
     * Build normalized bulk updates.
     *
     * bulkWrite does not execute the normal
     * document pre-validation middleware, so
     * defaults are handled here explicitly.
     */
    for (const locationPricing of pricing) {
      const locationId =
        String(locationPricing.locationId);

      for (
        const componentPricing of
        locationPricing.components
      ) {
        const componentId = String(
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

        requestedPricingKeys.add(
          `${locationId}_${componentId}`,
        );

        bulkOps.push({
          updateOne: {
            filter: {
              serviceId:
                new Types.ObjectId(
                  serviceId,
                ),

              tierId:
                new Types.ObjectId(tierId),

              locationId:
                new Types.ObjectId(
                  locationId,
                ),

              componentId:
                new Types.ObjectId(
                  componentId,
                ),
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
              },

              $setOnInsert: {
                serviceId:
                  new Types.ObjectId(
                    serviceId,
                  ),

                tierId:
                  new Types.ObjectId(
                    tierId,
                  ),

                locationId:
                  new Types.ObjectId(
                    locationId,
                  ),

                componentId:
                  new Types.ObjectId(
                    componentId,
                  ),
              },
            },

            upsert: true,
          },
        });
      }
    }

    /*
     * Current behavior treats the payload as
     * the full replacement for this service tier.
     *
     * Any records not present in the request
     * are deleted.
     */
    const requestedPairs =
      Array.from(
        requestedPricingKeys,
      ).map((key) => {
        const separatorIndex =
          key.indexOf("_");

        const locationId = key.slice(
          0,
          separatorIndex,
        );

        const componentId = key.slice(
          separatorIndex + 1,
        );

        return {
          locationId:
            new Types.ObjectId(locationId),

          componentId:
            new Types.ObjectId(componentId),
        };
      });

    await ServicePricing.deleteMany({
      serviceId:
        new Types.ObjectId(serviceId),

      tierId:
        new Types.ObjectId(tierId),

      $nor: requestedPairs,
    });

    if (bulkOps.length > 0) {
      await ServicePricing.bulkWrite(
        bulkOps,
        {
          ordered: true,
        },
      );
    }

    await ServiceCascadingEngine.run(
      serviceId,
    );

    return {
      success: true,
      message:
        "Pricing updated successfully",
      updatedCount: bulkOps.length,
    };
  }

  static async resolvePricing(
    serviceId: string,
    tierId: string,
    locationId: string,
  ) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    if (!Types.ObjectId.isValid(locationId)) {
      throw new Error("Invalid locationId");
    }

    const service = await Service.findById(serviceId).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    if (!service.isActive) {
      throw new Error("Service is inactive");
    }

    const tier = service.tiers.find((t) => t.tierId.toString() === tierId);

    if (!tier) {
      throw new Error("Tier does not belong to service");
    }

    const location = service.locations.find(
      (l) => l.locationId.toString() === locationId,
    );

    if (!location) {
      throw new Error("Location does not belong to service");
    }

    if (!location.isActive) {
      throw new Error("Location is inactive for this service");
    }

    const components = await ServiceComponent.find({
      serviceId,
      tierId,
    })
      .populate({
        path: "componentId",
        select: `
          name
          description
          imageUrl
          isActive
        `,
      })
      .select(
        `
        componentId
        isRequired
        items
        displayOrder
      `,
      )
      .sort({ displayOrder: 1 })
      .lean();

    const pricing =
      await ServicePricing.find({
        serviceId,
        tierId,
        locationId,
      })
        .select(`
      componentId
      price
      taxProfileId
      taxPriceMode
    `)
        .populate({
          path: "taxProfileId",
          select: `
        name
        code
        treatment
        totalRate
        isActive
      `,
        })
        .lean();

    const pricingMap = new Map(
      pricing.map((pricingRecord) => [
        pricingRecord.componentId.toString(),
        pricingRecord,
      ]),
    );

    const resolvedComponents =
      components.map((component) => {
        const componentData =
          component.componentId as any;

        const componentId =
          componentData._id.toString();

        const pricingRecord =
          pricingMap.get(componentId);

        const taxProfile =
          pricingRecord?.taxProfileId as
          | any
          | null
          | undefined;

        return {
          componentId:
            componentData._id,

          name:
            componentData.name,

          description:
            componentData.description ?? "",

          imageUrl:
            componentData.imageUrl ?? null,

          isRequired:
            component.isRequired,

          price:
            pricingRecord?.price ?? null,

          isPriceConfigured:
            Boolean(pricingRecord),

          tax: pricingRecord
            ? {
              taxProfileId:
                taxProfile?._id ?? null,

              profileName:
                taxProfile?.name ?? null,

              profileCode:
                taxProfile?.code ?? null,

              treatment:
                taxProfile?.treatment ??
                null,

              totalRate:
                taxProfile?.totalRate ?? 0,

              priceMode:
                pricingRecord.taxProfileId
                  ? pricingRecord.taxPriceMode
                  : "EXCLUSIVE",

              isTaxConfigured:
                Boolean(taxProfile),
            }
            : null,

          items:
            component.items ?? [],
        };
      });

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
}
