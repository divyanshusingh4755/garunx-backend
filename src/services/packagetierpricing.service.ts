import mongoose, {
  Types,
  type ClientSession,
} from "mongoose";

import {
  Package,
} from "../models/package.model.js";

import {
  PackageTierPricing,
} from "../models/packagetierpricing.model.js";

import {
  PackageTierMap,
} from "../models/packagetiermap.model.js";

import {
  ServicePricing,
} from "../models/servicepricing.model.js";

import {
  TaxProfile,
} from "../models/tax-profile.model.js";

import {
  Service,
} from "../models/service.model.js";

import {
  PackageCascadingEngine,
} from "./package-cascading-engine.service.js";

import {
  RedisCacheService,
} from "./redis-cache.service.js";

import {
  CacheKeys,
} from "../cache/cache-keys.js";

import {
  CACHE_TTL_SECONDS,
} from "../cache/constants.js";

import {
  HttpError,
} from "../utils/httpError.js";


type TaxPriceMode =
  | "EXCLUSIVE"
  | "INCLUSIVE";


interface PackageServicePricingPayload {
  serviceId: string;

  fixedPrice?: number;

  discountPercent?: number;

  taxProfileId: string;

  taxPriceMode?: TaxPriceMode;
}


interface PackageLocationPricingPayload {
  locationId: string;

  services:
  PackageServicePricingPayload[];
}


interface BulkUpsertPackagePricingPayload {
  packageId: string;

  tierId: string;

  pricing:
  PackageLocationPricingPayload[];
}


interface PreparedPricingRequest {
  packageId: string;

  tierId: string;

  pricing:
  PackageLocationPricingPayload[];

  serviceIds:
  string[];

  taxProfileIds:
  string[];

  locationIds:
  string[];
}


export class PackageTierPricingService {
  private static async invalidatePackagePricingCache(
    packageId: string,
  ): Promise<void> {
    await Promise.all([
      /*
       * Direct resolved package pricing.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys
          .packageResolvedPricingByPackagePattern(
            packageId,
          ),
      ),

      /*
       * Full package response.
       */
      RedisCacheService.delete(
        CacheKeys.packageFull(
          packageId,
        ),
      ),

      /*
       * City-specific full package response.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys
          .packageFullByCitiesPattern(
            packageId,
          ),
      ),

      /*
       * Related services response may expose
       * resolved package pricing.
       */
      RedisCacheService.deleteByPattern(
        CacheKeys
          .packageRelatedServicesPattern(
            packageId,
          ),
      ),

      /*
       * Cascading may modify:
       *
       * isComplete
       * isActive
       * startingPrice
       */
      RedisCacheService.delete(
        CacheKeys.packageDetail(
          packageId,
        ),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.packageListPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys
          .packageByLocationListPattern(),
      ),
    ]);
  }


  private static roundMoney(
    value: number,
  ): number {
    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
        100,
      ) /
      100
    );
  }


  /*
   * Request-level business validation which
   * does not depend on current MongoDB state.
   */
  private static prepareRequest(
    payload:
      BulkUpsertPackagePricingPayload,
  ): PreparedPricingRequest {
    const {
      packageId,
      tierId,
      pricing,
    } = payload;

    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw new HttpError(
        400,
        "Invalid packageId",
      );
    }

    if (
      !Types.ObjectId.isValid(
        tierId,
      )
    ) {
      throw new HttpError(
        400,
        "Invalid tierId",
      );
    }

    if (
      !Array.isArray(pricing) ||
      pricing.length === 0
    ) {
      throw new HttpError(
        400,
        "Pricing array is required",
      );
    }

    const serviceIds =
      new Set<string>();

    const taxProfileIds =
      new Set<string>();

    const locationIds =
      new Set<string>();

    for (
      const locationPricing of
      pricing
    ) {
      const locationId =
        locationPricing.locationId
          ?.toString();

      if (
        !locationId ||
        !Types.ObjectId.isValid(
          locationId,
        )
      ) {
        throw new HttpError(
          400,
          `Invalid locationId: ${locationPricing.locationId}`,
        );
      }

      if (
        locationIds.has(
          locationId,
        )
      ) {
        throw new HttpError(
          400,
          `Duplicate location found in pricing: ${locationId}`,
        );
      }

      locationIds.add(
        locationId,
      );

      if (
        !Array.isArray(
          locationPricing.services,
        ) ||
        locationPricing.services
          .length === 0
      ) {
        throw new HttpError(
          400,
          `Services array is required for location ${locationId}`,
        );
      }

      const locationServiceIds =
        new Set<string>();

      for (
        const servicePricing of
        locationPricing.services
      ) {
        const serviceId =
          servicePricing.serviceId
            ?.toString();

        const taxProfileId =
          servicePricing.taxProfileId
            ?.toString();

        if (
          !serviceId ||
          !Types.ObjectId.isValid(
            serviceId,
          )
        ) {
          throw new HttpError(
            400,
            `Invalid serviceId: ${servicePricing.serviceId}`,
          );
        }

        if (
          locationServiceIds.has(
            serviceId,
          )
        ) {
          throw new HttpError(
            400,
            `Duplicate service ${serviceId} for location ${locationId}`,
          );
        }

        locationServiceIds.add(
          serviceId,
        );

        serviceIds.add(
          serviceId,
        );

        if (
          !taxProfileId ||
          !Types.ObjectId.isValid(
            taxProfileId,
          )
        ) {
          throw new HttpError(
            400,
            `Invalid taxProfileId for service ${serviceId}`,
          );
        }

        taxProfileIds.add(
          taxProfileId,
        );

        const taxPriceMode =
          servicePricing
            .taxPriceMode ??
          "EXCLUSIVE";

        if (
          taxPriceMode !==
          "EXCLUSIVE" &&
          taxPriceMode !==
          "INCLUSIVE"
        ) {
          throw new HttpError(
            400,
            `Invalid taxPriceMode for service ${serviceId}`,
          );
        }

        const hasFixedPrice =
          typeof servicePricing
            .fixedPrice ===
          "number";

        const hasDiscountPercent =
          typeof servicePricing
            .discountPercent ===
          "number";

        if (
          hasFixedPrice &&
          hasDiscountPercent
        ) {
          throw new HttpError(
            400,
            `Service ${serviceId} cannot have both fixedPrice and discountPercent`,
          );
        }

        if (
          !hasFixedPrice &&
          !hasDiscountPercent
        ) {
          throw new HttpError(
            400,
            `Service ${serviceId} requires fixedPrice or discountPercent`,
          );
        }

        if (
          hasFixedPrice &&
          (
            !Number.isFinite(
              servicePricing
                .fixedPrice,
            ) ||
            servicePricing
              .fixedPrice! < 0
          )
        ) {
          throw new HttpError(
            400,
            `fixedPrice cannot be negative for service ${serviceId}`,
          );
        }

        if (
          hasDiscountPercent &&
          (
            !Number.isFinite(
              servicePricing
                .discountPercent,
            ) ||
            servicePricing
              .discountPercent! <
            0 ||
            servicePricing
              .discountPercent! >
            100
          )
        ) {
          throw new HttpError(
            400,
            `discountPercent must be between 0 and 100 for service ${serviceId}`,
          );
        }
      }
    }

    return {
      packageId,

      tierId,

      pricing,

      serviceIds:
        [...serviceIds],

      taxProfileIds:
        [...taxProfileIds],

      locationIds:
        [...locationIds],
    };
  }


  /*
   * Validate package, tier, package locations,
   * mapped services and current Service status.
   *
   * This runs INSIDE the pricing transaction.
   */
  private static async validateConfiguration(
    prepared:
      PreparedPricingRequest,

    session:
      ClientSession,
  ): Promise<void> {
    const {
      packageId,
      tierId,
      pricing,
      serviceIds,
    } = prepared;

    const pkg =
      await Package.findById(
        packageId,
      )
        .session(
          session,
        )
        .select(
          "_id tiers locations",
        )
        .lean();

    if (!pkg) {
      throw new HttpError(
        404,
        "Package not found",
      );
    }

    const tierExists =
      pkg.tiers.some(
        (tier) =>
          tier.tierId.toString() ===
          tierId,
      );

    if (
      !tierExists
    ) {
      throw new HttpError(
        400,
        "Tier does not belong to package",
      );
    }

    /*
     * Package pricing may only be configured
     * for ACTIVE package locations.
     */
    const activePackageLocationIds =
      new Set(
        pkg.locations
          .filter(
            (location) =>
              location.isActive,
          )
          .map(
            (location) =>
              location.locationId
                .toString(),
          ),
      );

    for (
      const locationPricing of
      pricing
    ) {
      const locationId =
        locationPricing.locationId
          .toString();

      if (
        !activePackageLocationIds.has(
          locationId,
        )
      ) {
        throw new HttpError(
          400,
          `Location ${locationId} does not belong to package or is inactive`,
        );
      }
    }

    /*
     * Services must belong to the selected
     * package+tier mapping.
     */
    const packageTierMap =
      await PackageTierMap.findOne({
        packageId:
          new Types.ObjectId(
            packageId,
          ),

        tierId:
          new Types.ObjectId(
            tierId,
          ),
      })
        .session(
          session,
        )
        .select(
          "services.serviceId",
        )
        .lean();

    if (
      !packageTierMap
    ) {
      throw new HttpError(
        400,
        "Package tier service mapping is not configured",
      );
    }

    const mappedServiceIds =
      new Set(
        (
          packageTierMap.services ??
          []
        ).map(
          (service) =>
            service.serviceId
              .toString(),
        ),
      );

    for (
      const serviceId of
      serviceIds
    ) {
      if (
        !mappedServiceIds.has(
          serviceId,
        )
      ) {
        throw new HttpError(
          400,
          `Service ${serviceId} does not belong to this package tier`,
        );
      }
    }

    /*
     * Every requested Service must still
     * be active and complete.
     *
     * We also load its tiers/locations so
     * package pricing cannot use a service
     * where that tier/location is unavailable.
     */
    const services =
      await Service.find({
        _id: {
          $in:
            serviceIds.map(
              (serviceId) =>
                new Types.ObjectId(
                  serviceId,
                ),
            ),
        },

        isActive:
          true,

        isComplete:
          true,
      })
        .session(
          session,
        )
        .select(
          "_id tiers locations",
        )
        .lean();

    if (
      services.length !==
      serviceIds.length
    ) {
      throw new HttpError(
        400,
        "One or more services are invalid, inactive, or incomplete",
      );
    }

    const serviceMap =
      new Map(
        services.map(
          (service) => [
            service._id.toString(),
            service,
          ],
        ),
      );

    /*
     * A requested package pricing pair is only
     * valid when that underlying Service itself
     * supports the same tier and active location.
     */
    for (
      const locationPricing of
      pricing
    ) {
      const locationId =
        locationPricing.locationId
          .toString();

      for (
        const servicePricing of
        locationPricing.services
      ) {
        const serviceId =
          servicePricing.serviceId
            .toString();

        const service =
          serviceMap.get(
            serviceId,
          );

        if (!service) {
          throw new HttpError(
            400,
            `Service ${serviceId} is unavailable`,
          );
        }

        const serviceHasTier =
          service.tiers.some(
            (tier) =>
              tier.tierId.toString() ===
              tierId,
          );

        if (
          !serviceHasTier
        ) {
          throw new HttpError(
            400,
            `Tier ${tierId} is not configured for service ${serviceId}`,
          );
        }

        const serviceHasActiveLocation =
          service.locations.some(
            (location) =>
              location.locationId
                .toString() ===
              locationId &&
              location.isActive,
          );

        if (
          !serviceHasActiveLocation
        ) {
          throw new HttpError(
            400,
            `Location ${locationId} is not active for service ${serviceId}`,
          );
        }
      }
    }
  }


  /*
   * Synchronize with TaxProfile deactivation.
   *
   * IMPORTANT:
   * TaxProfile must contain the pricingRevision
   * field introduced in our earlier TaxProfile fix.
   */
  private static async lockTaxProfiles(
    taxProfileIds:
      string[],

    session:
      ClientSession,
  ): Promise<void> {
    for (
      const taxProfileId of
      taxProfileIds
    ) {
      const result =
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
        result.matchedCount !==
        1
      ) {
        throw new HttpError(
          400,
          `Tax profile ${taxProfileId} is invalid or inactive`,
        );
      }
    }
  }


  /*
   * Build PackageTierPricing operations from
   * current ACTIVE ServicePricing.
   */
  private static async buildBulkOperations(
    prepared:
      PreparedPricingRequest,

    session:
      ClientSession,
  ) {
    const {
      packageId,
      tierId,
      pricing,
      serviceIds,
      locationIds,
    } = prepared;

    /*
     * Only ACTIVE ServicePricing contributes
     * to a package base price.
     */
    const basePricingRows =
      await ServicePricing.find({
        serviceId: {
          $in:
            serviceIds.map(
              (serviceId) =>
                new Types.ObjectId(
                  serviceId,
                ),
            ),
        },

        tierId:
          new Types.ObjectId(
            tierId,
          ),

        locationId: {
          $in:
            locationIds.map(
              (locationId) =>
                new Types.ObjectId(
                  locationId,
                ),
            ),
        },

        isActive:
          true,
      })
        .session(
          session,
        )
        .select(
          "serviceId locationId price",
        )
        .lean();

    const basePriceMap =
      new Map<
        string,
        number
      >();

    for (
      const pricingRow of
      basePricingRows
    ) {
      const key =
        `${pricingRow.locationId.toString()}_${pricingRow.serviceId.toString()}`;

      const currentTotal =
        basePriceMap.get(
          key,
        ) ??
        0;

      basePriceMap.set(
        key,

        this.roundMoney(
          currentTotal +
          pricingRow.price,
        ),
      );
    }

    const bulkOperations:
      any[] =
      [];

    for (
      const locationPricing of
      pricing
    ) {
      const locationId =
        locationPricing.locationId
          .toString();

      for (
        const servicePricing of
        locationPricing.services
      ) {
        const {
          serviceId,
          fixedPrice,
          discountPercent,
          taxProfileId,
        } =
          servicePricing;

        const requestKey =
          `${locationId}_${serviceId}`;

        const basePrice =
          basePriceMap.get(
            requestKey,
          );

        if (
          basePrice ===
          undefined
        ) {
          throw new HttpError(
            400,
            `Active base pricing is missing for service ${serviceId} at location ${locationId}`,
          );
        }

        const taxPriceMode =
          servicePricing
            .taxPriceMode ??
          "EXCLUSIVE";

        let finalPrice =
          basePrice;

        if (
          typeof fixedPrice ===
          "number"
        ) {
          finalPrice =
            fixedPrice;
        } else if (
          typeof discountPercent ===
          "number"
        ) {
          finalPrice =
            basePrice -
            (
              basePrice *
              discountPercent
            ) /
            100;
        }

        finalPrice =
          this.roundMoney(
            finalPrice,
          );

        if (
          finalPrice < 0 ||
          !Number.isFinite(
            finalPrice,
          )
        ) {
          throw new HttpError(
            400,
            `Invalid final price for service ${serviceId}`,
          );
        }

        bulkOperations.push({
          updateOne: {
            filter: {
              packageId:
                new Types.ObjectId(
                  packageId,
                ),

              tierId:
                new Types.ObjectId(
                  tierId,
                ),

              locationId:
                new Types.ObjectId(
                  locationId,
                ),

              serviceId:
                new Types.ObjectId(
                  serviceId,
                ),
            },

            update: {
              $set: {
                basePrice,

                fixedPrice:
                  typeof fixedPrice ===
                    "number"
                    ? fixedPrice
                    : null,

                discountPercent:
                  typeof discountPercent ===
                    "number"
                    ? discountPercent
                    : null,

                finalPrice,

                taxProfileId:
                  new Types.ObjectId(
                    taxProfileId,
                  ),

                taxPriceMode,
              },

              $setOnInsert: {
                packageId:
                  new Types.ObjectId(
                    packageId,
                  ),

                tierId:
                  new Types.ObjectId(
                    tierId,
                  ),

                locationId:
                  new Types.ObjectId(
                    locationId,
                  ),

                serviceId:
                  new Types.ObjectId(
                    serviceId,
                  ),
              },
            },

            upsert:
              true,
          },
        });
      }
    }

    return bulkOperations;
  }


  /*
   * TRUE BULK UPSERT.
   *
   * Submitted rows are inserted/updated.
   *
   * Existing rows omitted from the request
   * are NOT deleted.
   */
  static async bulkUpsertTierPricing(
    payload:
      BulkUpsertPackagePricingPayload,
  ) {
    const prepared =
      this.prepareRequest(
        payload,
      );

    const {
      packageId,
      taxProfileIds,
    } =
      prepared;

    const session =
      await mongoose.startSession();

    let updatedCount =
      0;

    try {
      await session.withTransaction(
        async () => {
          /*
           * All DB-dependent validation occurs
           * inside the same transaction.
           */
          await this.validateConfiguration(
            prepared,
            session,
          );

          /*
           * Lock + validate active TaxProfiles
           * in the SAME transaction.
           */
          await this.lockTaxProfiles(
            taxProfileIds,
            session,
          );

          /*
           * Base package prices are calculated
           * only from active ServicePricing.
           */
          const bulkOperations =
            await this.buildBulkOperations(
              prepared,
              session,
            );

          if (
            bulkOperations.length ===
            0
          ) {
            throw new HttpError(
              400,
              "No package pricing operations were generated",
            );
          }

          await PackageTierPricing.bulkWrite(
            bulkOperations,
            {
              session,

              ordered:
                true,
            },
          );

          updatedCount =
            bulkOperations.length;

          /*
           * IMPORTANT:
           *
           * Cascade runs BEFORE transaction commit.
           *
           * Package pricing + orphan cleanup +
           * completeness + startingPrice +
           * automatic deactivation therefore commit
           * atomically.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );
        },
      );
    } finally {
      await session.endSession();
    }

    /*
     * Redis is only invalidated after the
     * MongoDB transaction committed.
     */
    await this.invalidatePackagePricingCache(
      packageId,
    );

    return {
      success:
        true,

      message:
        "Package tier pricing updated successfully",

      updatedCount,
    };
  }


  static async resolvePricing(
    packageId: string,
    tierId: string,
    locationId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw new HttpError(
        400,
        "Invalid packageId",
      );
    }

    if (
      !Types.ObjectId.isValid(
        tierId,
      )
    ) {
      throw new HttpError(
        400,
        "Invalid tierId",
      );
    }

    if (
      !Types.ObjectId.isValid(
        locationId,
      )
    ) {
      throw new HttpError(
        400,
        "Invalid locationId",
      );
    }

    const cacheKey =
      CacheKeys.packageResolvedPricing(
        packageId,
        tierId,
        locationId,
      );

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_RESOLVED_PRICING,

      loader:
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).lean();

          if (!pkg) {
            throw new HttpError(
              404,
              "Package not found",
            );
          }

          /*
           * Customer pricing should never resolve
           * for an incomplete package, even if a
           * stale/manual status accidentally left
           * it active.
           */
          if (
            !pkg.isActive ||
            !pkg.isComplete
          ) {
            throw new HttpError(
              404,
              "Package is not available",
            );
          }

          const tier =
            pkg.tiers.find(
              (item) =>
                item.tierId
                  .toString() ===
                tierId,
            );

          if (!tier) {
            throw new HttpError(
              400,
              "Tier does not belong to package",
            );
          }

          const location =
            pkg.locations.find(
              (item) =>
                item.locationId
                  .toString() ===
                locationId,
            );

          if (!location) {
            throw new HttpError(
              400,
              "Location does not belong to package",
            );
          }

          if (
            !location.isActive
          ) {
            throw new HttpError(
              400,
              "Location is inactive for this package",
            );
          }

          /*
           * Resolve only Services which remain
           * globally active + complete AND support
           * this tier/location themselves.
           */
          const packageTierMap =
            await PackageTierMap.findOne({
              packageId,
              tierId,
            })
              .populate({
                path:
                  "services.serviceId",

                select:
                  [
                    "name",
                    "shortDescription",
                    "thumbnailImage",
                    "isActive",
                    "isComplete",
                    "tiers",
                    "locations",
                  ].join(" "),
              })
              .lean();

          if (
            !packageTierMap
          ) {
            throw new HttpError(
              400,
              "Package tier service mapping is not configured",
            );
          }

          const serviceList =
            (
              packageTierMap.services ??
              []
            )
              .filter(
                (
                  mappedService:
                    any,
                ) => {
                  const service =
                    mappedService
                      .serviceId;

                  if (
                    !service ||
                    !service.isActive ||
                    !service.isComplete
                  ) {
                    return false;
                  }

                  const hasTier =
                    (
                      service.tiers ??
                      []
                    ).some(
                      (
                        serviceTier:
                          any,
                      ) =>
                        serviceTier
                          .tierId
                          ?.toString() ===
                        tierId,
                    );

                  if (!hasTier) {
                    return false;
                  }

                  const hasActiveLocation =
                    (
                      service.locations ??
                      []
                    ).some(
                      (
                        serviceLocation:
                          any,
                      ) =>
                        serviceLocation
                          .locationId
                          ?.toString() ===
                        locationId &&
                        serviceLocation
                          .isActive ===
                        true,
                    );

                  return (
                    hasActiveLocation
                  );
                },
              )
              .map(
                (
                  mappedService:
                    any,
                ) => ({
                  serviceId:
                    mappedService
                      .serviceId
                      ._id
                      .toString(),

                  name:
                    mappedService
                      .serviceId
                      .name,

                  shortDescription:
                    mappedService
                      .serviceId
                      .shortDescription,

                  thumbnailImage:
                    mappedService
                      .serviceId
                      .thumbnailImage,

                  isRequired:
                    mappedService
                      .isRequired,

                  isRelated:
                    mappedService
                      .isRelated,
                }),
              );

          const serviceIds =
            serviceList.map(
              (service) =>
                new Types.ObjectId(
                  service.serviceId,
                ),
            );

          /*
           * CRITICAL:
           *
           * Only active ServicePricing contributes
           * to current service/package prices.
           */
          const basePricingRows =
            serviceIds.length >
              0
              ? await ServicePricing.find({
                serviceId: {
                  $in:
                    serviceIds,
                },

                tierId:
                  new Types.ObjectId(
                    tierId,
                  ),

                locationId:
                  new Types.ObjectId(
                    locationId,
                  ),

                isActive:
                  true,
              })
                .select(
                  "serviceId price",
                )
                .lean()
              : [];

          const basePriceMap =
            new Map<
              string,
              number
            >();

          for (
            const pricingRow of
            basePricingRows
          ) {
            const currentServiceId =
              pricingRow.serviceId
                .toString();

            const currentPrice =
              basePriceMap.get(
                currentServiceId,
              ) ??
              0;

            basePriceMap.set(
              currentServiceId,

              this.roundMoney(
                currentPrice +
                pricingRow.price,
              ),
            );
          }

          /*
           * An inactive TaxProfile is not returned
           * as a valid customer tax configuration.
           */
          const packagePricingRows =
            await PackageTierPricing.find({
              packageId:
                new Types.ObjectId(
                  packageId,
                ),

              tierId:
                new Types.ObjectId(
                  tierId,
                ),

              locationId:
                new Types.ObjectId(
                  locationId,
                ),

              serviceId: {
                $in:
                  serviceIds,
              },
            })
              .populate({
                path:
                  "taxProfileId",

                match: {
                  isActive:
                    true,
                },

                select:
                  "name code treatment totalRate isActive",
              })
              .lean();

          const packagePricingMap =
            new Map(
              packagePricingRows.map(
                (
                  pricingRow:
                    any,
                ) => [
                    pricingRow
                      .serviceId
                      .toString(),

                    {
                      basePrice:
                        pricingRow
                          .basePrice,

                      fixedPrice:
                        pricingRow
                          .fixedPrice,

                      discountPercent:
                        pricingRow
                          .discountPercent,

                      finalPrice:
                        pricingRow
                          .finalPrice,

                      taxProfile:
                        pricingRow
                          .taxProfileId,

                      taxPriceMode:
                        pricingRow
                          .taxPriceMode,
                    },
                  ],
              ),
            );

          const resolvedServices =
            serviceList.map(
              (service) => {
                const basePrice =
                  basePriceMap.get(
                    service.serviceId,
                  ) ??
                  null;

                const packagePricing =
                  packagePricingMap.get(
                    service.serviceId,
                  );

                const isPriceConfigured =
                  packagePricing !==
                  undefined &&
                  packagePricing
                    .finalPrice !==
                  null &&
                  packagePricing
                    .finalPrice !==
                  undefined;

                const isTaxConfigured =
                  Boolean(
                    packagePricing
                      ?.taxProfile,
                  );

                const isFullyConfigured =
                  isPriceConfigured &&
                  isTaxConfigured &&
                  basePrice !== null;

                return {
                  ...service,

                  basePrice,

                  fixedPrice:
                    packagePricing
                      ?.fixedPrice ??
                    null,

                  discountPercent:
                    packagePricing
                      ?.discountPercent ??
                    null,

                  /*
                   * Do not silently claim a
                   * package price is valid unless a
                   * PackageTierPricing row exists.
                   */
                  price:
                    isPriceConfigured
                      ? packagePricing!
                        .finalPrice
                      : basePrice,

                  taxConfiguration:
                    isTaxConfigured
                      ? {
                        taxProfile:
                          packagePricing!
                            .taxProfile,

                        taxPriceMode:
                          packagePricing!
                            .taxPriceMode,
                      }
                      : null,

                  isPriceConfigured,

                  isTaxConfigured,

                  isFullyConfigured,
                };
              },
            );

          const requiredServices =
            resolvedServices.filter(
              (service) =>
                service.isRequired &&
                !service.isRelated,
            );

          const optionalServices =
            resolvedServices.filter(
              (service) =>
                !service.isRequired &&
                !service.isRelated,
            );

          const relatedServices =
            resolvedServices.filter(
              (service) =>
                service.isRelated,
            );

          const startingPrice =
            requiredServices.reduce(
              (
                sum,
                service,
              ) =>
                sum +
                (
                  service
                    .isFullyConfigured &&
                    typeof service.price ===
                    "number"
                    ? service.price
                    : 0
                ),

              0,
            );

          const isAvailable =
            requiredServices.length >
            0 &&
            requiredServices.every(
              (service) =>
                service
                  .isFullyConfigured,
            );

          return {
            package: {
              id:
                pkg._id,

              name:
                pkg.name,

              description:
                pkg.fullDescription,
            },

            tier: {
              id:
                tier.tierId,

              name:
                tier.name,
            },

            location: {
              id:
                location.locationId,

              name:
                location.name,
            },

            services:
              resolvedServices,

            summary: {
              totalServices:
                requiredServices.length +
                optionalServices.length,

              requiredServiceCount:
                requiredServices.length,

              optionalServiceCount:
                optionalServices.length,

              relatedServiceCount:
                relatedServices.length,

              startingPrice:
                this.roundMoney(
                  startingPrice,
                ),

              isAvailable,
            },
          };
        },
    });
  }
}