import { Types } from "mongoose";

import { Package } from "../models/package.model.js";
import { Category } from "../models/category.model.js";
import { Tier } from "../models/tier.model.js";
import { Location } from "../models/location.model.js";
import { Service } from "../models/service.model.js";

import {
  PackageTierMap,
  type IPackageTierService,
} from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";

import { generateSlug } from "../utils/generateSlug.js";
import { getNextSequence } from "../utils/getNextSequence.js";

import { PackageCascadingEngine } from "./package-cascading-engine.service.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import mongoose from "mongoose";

const createHttpError = (message: string, statusCode: number) => {
  const error = new Error(message) as Error & {
    statusCode: number;
  };

  error.statusCode = statusCode;
  return error;
};

export class PackageService {
  private static async invalidatePackageCache(
    packageId?:
      string,
  ): Promise<void> {
    const operations:
      Promise<unknown>[] = [
        RedisCacheService.deleteByPattern(
          CacheKeys.packageListPattern(),
        ),

        RedisCacheService.deleteByPattern(
          CacheKeys.packageByLocationListPattern(),
        ),
      ];

    if (
      packageId
    ) {
      operations.push(
        RedisCacheService.delete(
          CacheKeys.packageDetail(
            packageId,
          ),
        ),

        RedisCacheService.delete(
          CacheKeys.packageFull(
            packageId,
          ),
        ),

        RedisCacheService.deleteByPattern(
          CacheKeys.packageFullByCitiesPattern(
            packageId,
          ),
        ),

        RedisCacheService.deleteByPattern(
          CacheKeys.packageRelatedServicesPattern(
            packageId,
          ),
        ),
      );
    }

    await Promise.all(
      operations,
    );
  }

  private static async buildFullPackageData(
    pkg: any,
    options?: {
      publicView?: boolean;
    },
  ) {
    const packageId =
      pkg._id.toString();

    const publicView =
      options?.publicView === true;

    /*
     * Load package mappings and pricing.
     *
     * TaxProfile populate only returns currently
     * active TaxProfiles. If a previously-used
     * profile has become inactive, tax configuration
     * will resolve as unavailable/null.
     */
    const [
      mappings,
      pricing,
    ] =
      await Promise.all([
        PackageTierMap.find({
          packageId:
            pkg._id,
        }).lean(),

        PackageTierPricing.find({
          packageId:
            pkg._id,
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
          .lean(),
      ]);

    /*
     * -------------------------------------------------
     * Collect all Service IDs referenced by mappings.
     * -------------------------------------------------
     */
    const serviceIds = [
      ...new Set(
        mappings.flatMap(
          (mapping) =>
            (
              mapping.services ??
              []
            ).map(
              (service) =>
                service.serviceId
                  .toString(),
            ),
        ),
      ),
    ];

    /*
     * -------------------------------------------------
     * Fetch Service metadata.
     *
     * ADMIN:
     * return mapped Services even when inactive or
     * incomplete, because admin needs configuration
     * visibility.
     *
     * PUBLIC:
     * expose only customer-ready Services.
     * -------------------------------------------------
     */
    const serviceQuery:
      Record<string, unknown> = {
      _id: {
        $in:
          serviceIds.map(
            (serviceId) =>
              new Types.ObjectId(
                serviceId,
              ),
          ),
      },
    };

    if (
      publicView
    ) {
      serviceQuery.isActive =
        true;

      serviceQuery.isComplete =
        true;
    }

    const services =
      serviceIds.length > 0
        ? await Service.find(
          serviceQuery,
        )
          .select(
            [
              "_id",
              "name",
              "categoryId",
              "thumbnailImage",
              "shortDescription",
              "isActive",
              "isComplete",
            ].join(" "),
          )
          .lean()
        : [];

    /*
     * Which mapped Services survived the public
     * visibility filter?
     *
     * For admin this contains every existing Service.
     */
    const availableServiceIds =
      new Set(
        services.map(
          (service) =>
            service._id.toString(),
        ),
      );

    /*
     * -------------------------------------------------
     * Collect Category IDs.
     *
     * Package category + Service categories.
     * -------------------------------------------------
     */
    const categoryIds = [
      ...new Set(
        [
          pkg.categoryId
            ?.toString(),

          ...services
            .map(
              (service) =>
                service.categoryId
                  ?.toString(),
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ].filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
      ),
    ];

    /*
     * -------------------------------------------------
     * Fetch categories.
     * -------------------------------------------------
     */
    const categories =
      categoryIds.length > 0
        ? await Category.find({
          _id: {
            $in:
              categoryIds.map(
                (categoryId) =>
                  new Types.ObjectId(
                    categoryId,
                  ),
              ),
          },
        })
          .select(
            "label value image",
          )
          .lean()
        : [];

    /*
     * -------------------------------------------------
     * Category lookup map.
     * -------------------------------------------------
     */
    const categoryMap =
      new Map(
        categories.map(
          (category: any) => [
            category._id
              .toString(),

            category,
          ],
        ),
      );

    /*
     * -------------------------------------------------
     * Service lookup map.
     * -------------------------------------------------
     */
    const serviceMap =
      new Map(
        services.map(
          (service: any) => [
            service._id
              .toString(),

            {
              name:
                service.name,

              shortDescription:
                service.shortDescription,

              thumbnailImage:
                service.thumbnailImage,

              categoryId:
                service.categoryId,

              isActive:
                service.isActive,

              isComplete:
                service.isComplete,
            },
          ],
        ),
      );

    /*
     * -------------------------------------------------
     * Group PackageTierPricing by:
     *
     * tierId + serviceId
     *
     * One service can contain separate pricing
     * for multiple package locations.
     * -------------------------------------------------
     */
    const pricingMap =
      new Map<
        string,
        any[]
      >();

    for (
      const price of
      pricing
    ) {
      const serviceId =
        price.serviceId.toString();

      /*
       * Public response should not expose pricing
       * belonging to an unavailable Service.
       */
      if (
        publicView &&
        !availableServiceIds.has(
          serviceId,
        )
      ) {
        continue;
      }

      const key =
        `${price.tierId.toString()}_${serviceId}`;

      if (
        !pricingMap.has(
          key,
        )
      ) {
        pricingMap.set(
          key,
          [],
        );
      }

      const taxProfile =
        price.taxProfileId as
        | {
          _id:
          Types.ObjectId;

          name?:
          string;

          code?:
          string;

          treatment?:
          string;

          totalRate?:
          number;

          isActive?:
          boolean;
        }
        | null
        | undefined;

      pricingMap
        .get(key)!
        .push({
          locationId:
            price.locationId,

          basePrice:
            price.basePrice,

          fixedPrice:
            price.fixedPrice,

          discountPercent:
            price.discountPercent,

          finalPrice:
            price.finalPrice,

          tax: {
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
              taxProfile
                ?.totalRate ??
              0,

            priceMode:
              taxProfile
                ? (
                  price.taxPriceMode ??
                  "EXCLUSIVE"
                )
                : "EXCLUSIVE",

            isTaxConfigured:
              Boolean(
                taxProfile,
              ),
          },
        });
    }

    /*
     * -------------------------------------------------
     * Group mapped Services by Tier.
     *
     * Result:
     *
     * services[tierId] = {
     *   tierId,
     *   services: [...]
     * }
     * -------------------------------------------------
     */
    const grouped:
      Record<
        string,
        {
          tierId: Types.ObjectId;
          services: any[];
        }
      > =
      {};

    for (
      const mapping of
      mappings
    ) {
      const tierId =
        mapping.tierId
          .toString();

      if (
        !grouped[
        tierId
        ]
      ) {
        grouped[
          tierId
        ] = {
          tierId:
            mapping.tierId,

          services:
            [],
        };
      }

      for (
        const mappedService of
        mapping.services ??
        []
      ) {
        const serviceId =
          mappedService
            .serviceId
            .toString();

        const serviceDetails =
          serviceMap.get(
            serviceId,
          );

        /*
         * Public response:
         * skip inactive/incomplete/deleted Services.
         *
         * Admin response:
         * preserve mapping even if underlying Service
         * was deleted. That is useful for diagnostics.
         */
        if (
          publicView &&
          !serviceDetails
        ) {
          continue;
        }

        const pricingKey =
          `${tierId}_${serviceId}`;

        const category =
          serviceDetails
            ?.categoryId
            ? categoryMap.get(
              serviceDetails
                .categoryId
                .toString(),
            )
            : null;

        grouped[
          tierId
        ].services.push({
          serviceId:
            mappedService
              .serviceId,

          /*
           * Mapping contains a snapshot name.
           *
           * Prefer current canonical Service name
           * when Service still exists.
           */
          name:
            serviceDetails
              ?.name ??
            mappedService
              .name,

          shortDescription:
            serviceDetails
              ?.shortDescription ??
            null,

          isRequired:
            mappedService
              .isRequired,

          isRelated:
            mappedService
              .isRelated,

          thumbnailImage:
            serviceDetails
              ?.thumbnailImage ??
            null,

          /*
           * These are useful particularly for
           * ADMIN configuration/diagnostics.
           */
          isActive:
            serviceDetails
              ?.isActive ??
            false,

          isComplete:
            serviceDetails
              ?.isComplete ??
            false,

          category:
            category
              ? {
                id:
                  category._id,

                label:
                  category.label,

                value:
                  category.value,

                image:
                  category.image,
              }
              : null,

          pricing:
            pricingMap.get(
              pricingKey,
            ) ??
            [],
        });
      }

      /*
       * In public view, avoid returning an empty
       * tier grouping if every mapped Service was
       * unavailable.
       *
       * If you prefer keeping empty tiers, remove
       * this block.
       */
      if (
        publicView &&
        grouped[tierId]
          .services.length ===
        0
      ) {
        delete grouped[
          tierId
        ];
      }
    }

    /*
     * -------------------------------------------------
     * Package category.
     * -------------------------------------------------
     */
    const packageCategory =
      pkg.categoryId
        ? categoryMap.get(
          pkg.categoryId
            .toString(),
        )
        : null;

    /*
     * -------------------------------------------------
     * Public locations:
     * only active package locations.
     *
     * Admin:
     * all package locations.
     * -------------------------------------------------
     */
    const locations =
      publicView
        ? (
          pkg.locations ??
          []
        ).filter(
          (
            location:
              any,
          ) =>
            location.isActive,
        )
        : (
          pkg.locations ??
          []
        );

    /*
     * -------------------------------------------------
     * Final response.
     * -------------------------------------------------
     */
    return {
      package: {
        id:
          pkg._id,

        name:
          pkg.name,

        shortDescription:
          pkg.shortDescription,

        fullDescription:
          pkg.fullDescription,

        thumbnailImage:
          pkg.thumbnailImage,

        bannerImage:
          pkg.bannerImage,

        category:
          packageCategory
            ? {
              id:
                packageCategory
                  ._id,

              label:
                packageCategory
                  .label,

              value:
                packageCategory
                  .value,

              image:
                packageCategory
                  .image,
            }
            : null,

        isActive:
          pkg.isActive,

        isComplete:
          pkg.isComplete,

        packageReference:
          pkg.packageReference,

        startingPrice:
          pkg.startingPrice,
      },

      locations,

      tiers:
        (
          pkg.tiers ??
          []
        ).map(
          (
            tier:
              any,
          ) => ({
            tierId:
              tier.tierId,

            name:
              tier.name,
          }),
        ),

      services:
        grouped,
    };
  }

  static async createPackage(payload: any) {
    let {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = payload;

    name = name?.trim();
    shortDescription = shortDescription?.trim();
    fullDescription = fullDescription?.trim();
    thumbnailImage = thumbnailImage?.trim();
    bannerImage = bannerImage?.trim();

    if (
      !name ||
      !shortDescription ||
      !fullDescription ||
      !categoryId ||
      !thumbnailImage
    ) {
      throw new Error("Missing required fields");
    }

    if (!Types.ObjectId.isValid(categoryId)) {
      throw new Error("Invalid categoryId format");
    }

    const categoryExists = await Category.exists({
      _id: categoryId,
    });

    if (!categoryExists) {
      throw new Error("Invalid categoryId");
    }

    const slug = generateSlug(name);

    const seq = await getNextSequence(`package_${slug}`);

    const packageReference = `${slug}_${String(seq).padStart(4, "0")}`;

    const pkg = await Package.create({
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
      locations: [],
      tiers: [],
      packageReference,
      isActive: false,
      isComplete: false,
    });

    await this.invalidatePackageCache();

    return pkg;
  }

  static async updatePackage(packageId: string, payload: any) {
    const {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error("Package name cannot be empty");
      }

      updateData.name = name.trim();
    }

    if (shortDescription !== undefined) {
      if (!shortDescription.trim()) {
        throw new Error("Short description cannot be empty");
      }

      updateData.shortDescription = shortDescription.trim();
    }

    if (fullDescription !== undefined) {
      if (typeof fullDescription !== "string") {
        throw new Error("Invalid fullDescription");
      }

      updateData.fullDescription = fullDescription.trim();
    }

    if (thumbnailImage !== undefined) {
      updateData.thumbnailImage = thumbnailImage;
    }

    if (bannerImage !== undefined) {
      updateData.bannerImage = bannerImage;
    }

    if (categoryId !== undefined) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid categoryId format");
      }

      const categoryExists = await Category.exists({
        _id: categoryId,
      });

      if (!categoryExists) {
        throw new Error("Invalid categoryId");
      }

      updateData.categoryId = categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    await this.invalidatePackageCache(packageId);

    return updatedPackage;
  }

  static async getPackageById(
    packageId:
      string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw new Error(
        "Invalid packageId",
      );
    }

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.packageDetail(
          packageId,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_DETAIL,

      loader:
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).lean();

          if (
            !pkg
          ) {
            throw new Error(
              "Package not found",
            );
          }

          return pkg;
        },
    });
  }

  static async togglePackageStatus(
    packageId: string,
    isActive: boolean,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      typeof isActive !==
      "boolean"
    ) {
      throw createHttpError(
        "isActive must be boolean",
        400,
      );
    }

    const session =
      await mongoose.startSession();

    try {
      let message = "";

      await session.withTransaction(
        async () => {
          /*
           * Deactivation does not change package
           * configuration, so simply disable it.
           */
          if (
            !isActive
          ) {
            const pkg =
              await Package.findById(
                packageId,
              ).session(
                session,
              );

            if (!pkg) {
              throw createHttpError(
                "Package not found",
                404,
              );
            }

            if (
              !pkg.isActive
            ) {
              message =
                "Package already inactive";

              return;
            }

            pkg.isActive =
              false;

            await pkg.save({
              session,
            });

            message =
              "Package deactivated successfully";

            return;
          }

          /*
           * ACTIVATION:
           *
           * Re-evaluate/cascade the complete package
           * configuration inside the same transaction.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );

          const pkg =
            await Package.findById(
              packageId,
            ).session(
              session,
            );

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          if (
            !pkg.isComplete
          ) {
            throw createHttpError(
              "Package configuration incomplete. Cannot activate.",
              400,
            );
          }

          if (
            pkg.isActive
          ) {
            message =
              "Package already active";

            return;
          }

          /*
           * PackageCascadingEngine intentionally
           * never automatically activates.
           *
           * Explicit admin activation happens here.
           */
          pkg.isActive =
            true;

          await pkg.save({
            session,
          });

          message =
            "Package activated successfully";
        },
      );

      await this.invalidatePackageCache(
        packageId,
      );

      return {
        success: true,
        message,
      };
    } finally {
      await session.endSession();
    }
  }

  static async findPackages(
    searchTerm?: string,
    categoryId?: string,
    locationId?: string,
    tierId?: string,
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    isComplete?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    /*
     * Normalize pagination first.
     *
     * Cache keys must use the same effective
     * values that MongoDB will use.
     */
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    const safePage = Math.max(
      page,
      1,
    );

    /*
     * Validate ObjectId filters before
     * attempting Redis lookup.
     *
     * Invalid requests should fail immediately
     * and should never create cache entries.
     */
    if (
      categoryId &&
      !Types.ObjectId.isValid(categoryId)
    ) {
      throw new Error(
        "Invalid categoryId",
      );
    }

    if (
      locationId &&
      !Types.ObjectId.isValid(locationId)
    ) {
      throw new Error(
        "Invalid locationId",
      );
    }

    if (
      tierId &&
      !Types.ObjectId.isValid(tierId)
    ) {
      throw new Error(
        "Invalid tierId",
      );
    }

    /*
     * Normalize search.
     */
    const term =
      searchTerm?.trim();

    const useTextSearch =
      Boolean(
        term &&
        term.length > 4,
      );

    /*
     * Never allow arbitrary MongoDB
     * fields to be passed as sort keys.
     */
    const allowedSortFields =
      new Set([
        "name",
        "createdAt",
        "updatedAt",
        "startingPrice",
        "isActive",
        "isComplete",
      ]);

    const safeSortBy =
      useTextSearch &&
        sortBy === "relevance"
        ? "relevance"
        : allowedSortFields.has(
          sortBy,
        )
          ? sortBy
          : "createdAt";

    /*
     * Build deterministic Redis key
     * from normalized/effective values.
     */
    const cacheKey =
      CacheKeys.packageList({
        searchTerm:
          term,
        categoryId,
        locationId,
        tierId,
        limit:
          safeLimit,
        page:
          safePage,
        isActive,
        isComplete,
        sortBy:
          safeSortBy,
        sortOrder,
      });

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_LIST,

      loader:
        async () => {
          const skip =
            (safePage - 1) *
            safeLimit;

          const matchQuery:
            Record<string, any> = {};

          /*
           * Active filter
           */
          if (
            typeof isActive ===
            "boolean"
          ) {
            matchQuery.isActive =
              isActive;
          }

          /*
           * Complete filter
           */
          if (
            typeof isComplete ===
            "boolean"
          ) {
            matchQuery.isComplete =
              isComplete;
          }

          /*
           * Category filter
           */
          if (
            categoryId
          ) {
            matchQuery.categoryId =
              new Types.ObjectId(
                categoryId,
              );
          }

          /*
           * Location filter
           */
          if (
            locationId
          ) {
            matchQuery[
              "locations.locationId"
            ] =
              new Types.ObjectId(
                locationId,
              );
          }

          /*
           * Tier filter
           */
          if (
            tierId
          ) {
            matchQuery[
              "tiers.tierId"
            ] =
              new Types.ObjectId(
                tierId,
              );
          }

          /*
           * Search
           */
          if (
            term
          ) {
            if (
              useTextSearch
            ) {
              matchQuery.$text = {
                $search:
                  term,
              };
            } else {
              matchQuery.name = {
                $regex:
                  escapeRegex(
                    term,
                  ),

                $options:
                  "i",
              };
            }
          }

          /*
           * Sorting
           */
          let sortCriteria:
            Record<
              string,
              any
            > = {};

          if (
            useTextSearch &&
            safeSortBy ===
            "relevance"
          ) {
            sortCriteria = {
              score: {
                $meta:
                  "textScore",
              },
            };
          } else {
            sortCriteria[
              safeSortBy
            ] =
              sortOrder ===
                "desc"
                ? -1
                : 1;

            /*
             * Stable secondary sorting.
             *
             * This prevents inconsistent ordering
             * when multiple records have the same
             * value for the requested sort field.
             */
            if (
              safeSortBy !==
              "createdAt"
            ) {
              sortCriteria.createdAt =
                -1;
            }
          }

          /*
           * Fetch list + total count concurrently.
           */
          const [
            data,
            total,
          ] =
            await Promise.all([
              Package.find(
                matchQuery,
              )
                .select({
                  name:
                    1,

                  shortDescription:
                    1,

                  thumbnailImage:
                    1,

                  categoryId:
                    1,

                  isActive:
                    1,

                  isComplete:
                    1,

                  packageReference:
                    1,

                  locations:
                    1,

                  tiers:
                    1,

                  startingPrice:
                    1,

                  createdAt:
                    1,

                  updatedAt:
                    1,

                  ...(useTextSearch && {
                    score: {
                      $meta:
                        "textScore",
                    },
                  }),
                })
                .sort(
                  sortCriteria,
                )
                .skip(
                  skip,
                )
                .limit(
                  safeLimit,
                )
                .lean(),

              Package.countDocuments(
                matchQuery,
              ),
            ]);

          return {
            data,

            total,

            page:
              safePage,

            totalPages:
              Math.ceil(
                total /
                safeLimit,
              ),
          };
        },
    });
  }

  static async updatePackageLocations(
    packageId: string,
    locations: {
      locationId: string;
    }[],
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      !Array.isArray(
        locations,
      ) ||
      locations.length === 0
    ) {
      throw createHttpError(
        "At least one location is required",
        400,
      );
    }

    const uniqueIds = [
      ...new Set(
        locations.map(
          (location) =>
            location.locationId,
        ),
      ),
    ];

    const objectIds =
      uniqueIds.map(
        (id) => {
          if (
            !Types.ObjectId.isValid(
              id,
            )
          ) {
            throw createHttpError(
              `Invalid locationId: ${id}`,
              400,
            );
          }

          return new Types.ObjectId(
            id,
          );
        },
      );

    const session =
      await mongoose.startSession();

    let updatedLocations:
      any[] = [];

    try {
      await session.withTransaction(
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).session(
              session,
            );

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          /*
           * Only globally active Locations may
           * be attached to a Package.
           */
          const validLocations =
            await Location.find({
              _id: {
                $in:
                  objectIds,
              },

              isActive:
                true,
            })
              .session(
                session,
              )
              .select(
                "_id name",
              );

          if (
            validLocations.length !==
            objectIds.length
          ) {
            throw createHttpError(
              "One or more locations are invalid or inactive",
              400,
            );
          }

          pkg.locations =
            validLocations.map(
              (location) => ({
                locationId:
                  location._id,

                name:
                  location.name,

                isActive:
                  true,
              }),
            );

          await pkg.save({
            session,
          });

          /*
           * Same transaction:
           * cleanup pricing + recalculate package.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );

          updatedLocations =
            pkg.locations;
        },
      );

      await this.invalidatePackageCache(
        packageId,
      );

      return {
        success: true,

        message:
          "Package locations updated successfully",

        locations:
          updatedLocations,
      };
    } finally {
      await session.endSession();
    }
  }

  static async removePackageLocation(
    packageId: string,
    locationId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      !Types.ObjectId.isValid(
        locationId,
      )
    ) {
      throw createHttpError(
        "Invalid locationId",
        400,
      );
    }

    const session =
      await mongoose.startSession();

    let resultLocations:
      any[] = [];

    let alreadyMissing =
      false;

    try {
      await session.withTransaction(
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).session(
              session,
            );

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          const exists =
            pkg.locations.some(
              (location) =>
                location.locationId
                  .toString() ===
                locationId,
            );

          if (!exists) {
            alreadyMissing =
              true;

            resultLocations =
              pkg.locations;

            return;
          }

          pkg.locations =
            pkg.locations.filter(
              (location) =>
                location.locationId
                  .toString() !==
                locationId,
            );

          await pkg.save({
            session,
          });

          /*
           * Removes orphan pricing for this
           * location and recalculates package.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );

          resultLocations =
            pkg.locations;
        },
      );

      if (!alreadyMissing) {
        await this.invalidatePackageCache(
          packageId,
        );
      }

      return {
        success: true,

        message:
          alreadyMissing
            ? "Location already not present"
            : "Location removed successfully",

        locations:
          resultLocations,
      };
    } finally {
      await session.endSession();
    }
  }

  static async updatePackageTiers(
    packageId: string,
    tiers: {
      tierId: string;
    }[],
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      !Array.isArray(tiers) ||
      tiers.length === 0
    ) {
      throw createHttpError(
        "At least one tier is required",
        400,
      );
    }

    const uniqueIds = [
      ...new Set(
        tiers.map(
          (tier) =>
            tier.tierId,
        ),
      ),
    ];

    const objectIds =
      uniqueIds.map(
        (id) => {
          if (
            !Types.ObjectId.isValid(
              id,
            )
          ) {
            throw createHttpError(
              `Invalid tierId: ${id}`,
              400,
            );
          }

          return new Types.ObjectId(
            id,
          );
        },
      );

    const session =
      await mongoose.startSession();

    let updatedTiers:
      any[] = [];

    try {
      await session.withTransaction(
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).session(
              session,
            );

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          /*
           * Only active global Tiers may be
           * attached to a Package.
           */
          const validTiers =
            await Tier.find({
              _id: {
                $in:
                  objectIds,
              },

              isActive:
                true,
            })
              .session(
                session,
              )
              .select(
                "_id name",
              );

          if (
            validTiers.length !==
            objectIds.length
          ) {
            throw createHttpError(
              "One or more tiers are invalid or inactive",
              400,
            );
          }

          pkg.tiers =
            validTiers.map(
              (tier) => ({
                tierId:
                  tier._id,

                name:
                  tier.name,
              }),
            );

          await pkg.save({
            session,
          });

          /*
           * Remove orphan mappings/pricing and
           * recalculate completeness/price.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );

          updatedTiers =
            pkg.tiers;
        },
      );

      await this.invalidatePackageCache(
        packageId,
      );

      return {
        success: true,

        message:
          "Package tiers updated successfully",

        tiers:
          updatedTiers,
      };
    } finally {
      await session.endSession();
    }
  }

  static async removePackageTier(
    packageId: string,
    tierId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      !Types.ObjectId.isValid(
        tierId,
      )
    ) {
      throw createHttpError(
        "Invalid tierId",
        400,
      );
    }

    const session =
      await mongoose.startSession();

    let resultTiers:
      any[] = [];

    let alreadyMissing =
      false;

    try {
      await session.withTransaction(
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).session(
              session,
            );

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          const exists =
            pkg.tiers.some(
              (tier) =>
                tier.tierId
                  .toString() ===
                tierId,
            );

          if (!exists) {
            alreadyMissing =
              true;

            resultTiers =
              pkg.tiers;

            return;
          }

          pkg.tiers =
            pkg.tiers.filter(
              (tier) =>
                tier.tierId
                  .toString() !==
                tierId,
            );

          await pkg.save({
            session,
          });

          /*
           * Removes PackageTierMap +
           * PackageTierPricing orphans for
           * removed tier.
           */
          await PackageCascadingEngine.run(
            packageId,
            session,
          );

          resultTiers =
            pkg.tiers;
        },
      );

      if (!alreadyMissing) {
        await this.invalidatePackageCache(
          packageId,
        );
      }

      return {
        success: true,

        message:
          alreadyMissing
            ? "Tier already not present"
            : "Tier removed successfully",

        tiers:
          resultTiers,
      };
    } finally {
      await session.endSession();
    }
  }

  static async getFullPackage(
    packageId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.packageFull(
          packageId,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_FULL,

      loader:
        async () => {
          const pkg =
            await Package.findOne({
              _id:
                packageId,

              isActive:
                true,

              isComplete:
                true,
            }).lean();

          if (!pkg) {
            throw createHttpError(
              "Package not available",
              404,
            );
          }

          return this.buildFullPackageData(
            pkg,
            {
              publicView: true,
            },
          );
        },
    });
  }

  static async getFullPackageAdmin(
    packageId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    const pkg =
      await Package.findById(
        packageId,
      ).lean();

    if (!pkg) {
      throw createHttpError(
        "Package not found",
        404,
      );
    }

    return this.buildFullPackageData(
      pkg,
      {
        publicView: false,
      },
    );
  }

  static async getRelatedPackageService(
    packageId: string,
    tierId: string,
    locationId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        packageId,
      )
    ) {
      throw createHttpError(
        "Invalid packageId",
        400,
      );
    }

    if (
      !Types.ObjectId.isValid(
        tierId,
      )
    ) {
      throw createHttpError(
        "Invalid tierId",
        400,
      );
    }

    if (
      !Types.ObjectId.isValid(
        locationId,
      )
    ) {
      throw createHttpError(
        "Invalid locationId",
        400,
      );
    }

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.packageRelatedServices(
          packageId,
          tierId,
          locationId,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_RELATED_SERVICES,

      loader:
        async () => {
          const pkg =
            await Package.findById(
              packageId,
            ).lean();

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          /*
           * Public endpoint.
           */
          if (
            !pkg.isActive ||
            !pkg.isComplete
          ) {
            throw createHttpError(
              "Package not available",
              404,
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
            throw createHttpError(
              "Tier does not belong to package",
              400,
            );
          }

          const packageLocation =
            pkg.locations.find(
              (item) =>
                item.locationId
                  .toString() ===
                locationId,
            );

          if (
            !packageLocation
          ) {
            throw createHttpError(
              "Location does not belong to package",
              400,
            );
          }

          if (
            !packageLocation
              .isActive
          ) {
            throw createHttpError(
              "Location is inactive for this package",
              400,
            );
          }

          const [
            mapping,
            pricing,
          ] =
            await Promise.all([
              PackageTierMap.findOne({
                packageId,
                tierId,
              }).lean(),

              PackageTierPricing.find({
                packageId,
                tierId,
                locationId,
              }).lean(),
            ]);

          if (!mapping) {
            throw createHttpError(
              "Package tier mapping not found",
              404,
            );
          }

          const relatedServices =
            (
              mapping.services ??
              []
            ).filter(
              (
                service:
                  IPackageTierService,
              ) =>
                service.isRelated,
            );

          const serviceIds =
            relatedServices.map(
              (
                service:
                  IPackageTierService,
              ) =>
                service.serviceId
                  .toString(),
            );

          /*
           * Only expose customer-ready Services.
           */
          const services =
            await Service.find({
              _id: {
                $in:
                  serviceIds,
              },

              isActive:
                true,

              isComplete:
                true,
            })
              .select(
                "_id categoryId thumbnailImage tiers locations",
              )
              .lean();

          /*
           * Service itself must also support the
           * selected package tier/location.
           */
          const validServices =
            services.filter(
              (service) => {
                const hasTier =
                  service.tiers.some(
                    (serviceTier) =>
                      serviceTier.tierId
                        .toString() ===
                      tierId,
                  );

                const hasLocation =
                  service.locations.some(
                    (location) =>
                      location.locationId
                        .toString() ===
                      locationId &&
                      location.isActive,
                  );

                return (
                  hasTier &&
                  hasLocation
                );
              },
            );

          const validServiceIds =
            new Set(
              validServices.map(
                (service) =>
                  service._id
                    .toString(),
              ),
            );

          const filteredRelatedServices =
            relatedServices.filter(
              (service) =>
                validServiceIds.has(
                  service.serviceId
                    .toString(),
                ),
            );

          const categoryIds = [
            ...new Set(
              [
                pkg.categoryId
                  ?.toString(),

                ...validServices
                  .map(
                    (service) =>
                      service.categoryId
                        ?.toString(),
                  )
                  .filter(
                    (
                      value,
                    ): value is string =>
                      Boolean(value),
                  ),
              ].filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              ),
            ),
          ];

          const categories =
            await Category.find({
              _id: {
                $in:
                  categoryIds,
              },
            })
              .select(
                "label value image",
              )
              .lean();

          const categoryMap =
            new Map(
              categories.map(
                (category: any) => [
                  category._id
                    .toString(),
                  category,
                ],
              ),
            );

          const serviceMap =
            new Map(
              validServices.map(
                (service: any) => [
                  service._id
                    .toString(),

                  {
                    thumbnailImage:
                      service
                        .thumbnailImage,

                    categoryId:
                      service
                        .categoryId,
                  },
                ],
              ),
            );

          const pricingMap =
            new Map(
              pricing
                .filter(
                  (price) =>
                    validServiceIds.has(
                      price.serviceId
                        .toString(),
                    ),
                )
                .map(
                  (price) => [
                    price.serviceId
                      .toString(),

                    {
                      locationId:
                        price.locationId,

                      basePrice:
                        price.basePrice,

                      fixedPrice:
                        price.fixedPrice,

                      discountPercent:
                        price.discountPercent,

                      finalPrice:
                        price.finalPrice,
                    },
                  ],
                ),
            );

          const hydratedRelatedServices =
            filteredRelatedServices.map(
              (service) => {
                const serviceDetails =
                  serviceMap.get(
                    service.serviceId
                      .toString(),
                  );

                const category =
                  serviceDetails
                    ?.categoryId
                    ? categoryMap.get(
                      serviceDetails
                        .categoryId
                        .toString(),
                    )
                    : null;

                return {
                  serviceId:
                    service.serviceId,

                  name:
                    service.name,

                  isRequired:
                    service.isRequired,

                  isRelated:
                    service.isRelated,

                  thumbnailImage:
                    serviceDetails
                      ?.thumbnailImage ??
                    null,

                  category:
                    category
                      ? {
                        id:
                          category._id,

                        label:
                          category.label,

                        value:
                          category.value,

                        image:
                          category.image,
                      }
                      : null,

                  pricing:
                    pricingMap.get(
                      service.serviceId
                        .toString(),
                    ) ??
                    null,
                };
              },
            );

          const packageCategory =
            pkg.categoryId
              ? categoryMap.get(
                pkg.categoryId
                  .toString(),
              )
              : null;

          return {
            package: {
              id:
                pkg._id,

              name:
                pkg.name,

              shortDescription:
                pkg.shortDescription,

              fullDescription:
                pkg.fullDescription,

              thumbnailImage:
                pkg.thumbnailImage,

              bannerImage:
                pkg.bannerImage,

              category:
                packageCategory
                  ? {
                    id:
                      packageCategory
                        ._id,

                    label:
                      packageCategory
                        .label,

                    value:
                      packageCategory
                        .value,

                    image:
                      packageCategory
                        .image,
                  }
                  : null,

              isActive:
                pkg.isActive,

              isComplete:
                pkg.isComplete,

              packageReference:
                pkg.packageReference,

              startingPrice:
                pkg.startingPrice,
            },

            /*
             * Don't expose every package location
             * when user asked about one location.
             */
            location: {
              locationId:
                packageLocation
                  .locationId,

              name:
                packageLocation
                  .name,
            },

            tier: {
              tierId:
                tier.tierId,

              name:
                tier.name,
            },

            relatedServices:
              hydratedRelatedServices,
          };
        },
    });
  }

  static async validatePackageConfiguration(
    packageId: string,
  ) {
    const evaluation =
      await PackageCascadingEngine
        .evaluateConfiguration(
          packageId,
        );

    /*
     * Persist derived package state.
     *
     * Never automatically activate.
     *
     * If configuration becomes invalid,
     * automatically deactivate the package.
     */
    const update:
      Record<string, unknown> = {
      isComplete:
        evaluation.isComplete,

      startingPrice:
        evaluation.startingPrice,
    };

    if (
      !evaluation.isComplete
    ) {
      update.isActive =
        false;

      update.startingPrice =
        0;
    }

    const updated =
      await Package.findByIdAndUpdate(
        packageId,
        {
          $set:
            update,
        },
        {
          new:
            true,

          runValidators:
            true,
        },
      ).lean();

    if (
      !updated
    ) {
      throw createHttpError(
        "Package not found",
        404,
      );
    }

    await this.invalidatePackageCache(
      packageId,
    );

    return {
      isComplete:
        evaluation.isComplete,

      issues:
        evaluation.issues,
    };
  }

  static async getFullPackageByCities(packageId: string, cityIds: string[]) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      throw new Error("cityIds must be a non-empty array");
    }

    const invalidCityIds = cityIds.filter((id) => !Types.ObjectId.isValid(id));

    if (invalidCityIds.length > 0) {
      throw new Error(`Invalid cityIds: ${invalidCityIds.join(", ")}`);
    }

    const cacheKey =
      CacheKeys.packageFullByCities(
        packageId,
        cityIds,
      );

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .PACKAGE_FULL_BY_CITIES,

      loader:
        async () => {

          const locations = await Location.find({
            cityId: {
              $in: cityIds.map((id) => new Types.ObjectId(id)),
            },
            isActive: true,
          })
            .populate({
              path: "cityId",
              select: "name",
            })
            .select("_id name cityId")
            .lean();

          const locationIds = locations.map((loc) => loc._id);

          const locationMap = new Map(
            locations.map((loc: any) => [
              loc._id.toString(),
              {
                locationId: loc._id,
                locationName: loc.name,
                city: loc.cityId,
              },
            ]),
          );

          const pkg = await Package.findById(packageId).lean();

          if (!pkg) {
            throw createHttpError(
              "Package not found",
              404,
            );
          }

          if (
            !pkg.isActive ||
            !pkg.isComplete
          ) {
            throw createHttpError(
              "Package not available",
              404,
            );
          }

          const filteredLocations =
            pkg.locations
              .filter(
                (location: any) =>
                  location.isActive &&
                  locationIds.some(
                    (id) =>
                      id.toString() ===
                      location.locationId
                        .toString(),
                  ),
              )
              .map((loc: any) => ({
                ...loc,
                locationDetails: locationMap.get(loc.locationId.toString()) || null,
              }));

          const [tierMaps, pricing] = await Promise.all([
            PackageTierMap.find({ packageId }).lean(),

            PackageTierPricing.find({
              packageId,
              locationId: { $in: locationIds },
            }).lean(),
          ]);

          const pricingMap = new Map<string, any[]>();

          for (const p of pricing) {
            const key = `${p.tierId}_${p.serviceId}`;

            if (!pricingMap.has(key)) {
              pricingMap.set(key, []);
            }

            pricingMap.get(key)!.push({
              locationId: p.locationId,
              locationDetails: locationMap.get(p.locationId.toString()) || null,
              basePrice: p.basePrice,
              fixedPrice: p.fixedPrice,
              discountPercent: p.discountPercent,
              finalPrice: p.finalPrice,
            });
          }

          const grouped: Record<string, any> = {};
          for (const tierMap of tierMaps) {
            const tierId = tierMap.tierId.toString();

            if (!grouped[tierId]) {
              grouped[tierId] = {
                tierId: tierMap.tierId,
                services: [],
              };
            }

            for (const service of tierMap.services) {
              const key = `${tierMap.tierId}_${service.serviceId}`;

              const servicePricing = pricingMap.get(key) || [];

              if (servicePricing.length === 0) continue;

              grouped[tierId].services.push({
                serviceId: service.serviceId,
                name: service.name,
                isRequired: service.isRequired,
                pricing: servicePricing,
              });
            }
          }

          const filteredTiers = pkg.tiers.filter((t) => grouped[t.tierId.toString()]);

          return {
            package: {
              id: pkg._id,
              name: pkg.name,
              shortDescription: pkg.shortDescription,
              fullDescription: pkg.fullDescription,
              thumbnailImage: pkg.thumbnailImage,
              bannerImage: pkg.bannerImage,
              isActive: pkg.isActive,
              isComplete: pkg.isComplete,
              packageReference: pkg.packageReference,
              startingPrice: pkg.startingPrice,
            },

            locations: filteredLocations,

            tiers: filteredTiers.map((t) => ({
              tierId: t.tierId,
              name: t.name,
            })),

            components: grouped, // (services grouped under tiers)
          };
        },
    });
  }

  static async getPackagesByLocation(
    cityIds?: string[],
    categoryIds?: string[],
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    isComplete?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = (page - 1) * limit;

    const matchQuery: any = {};

    if (cityIds?.length) {
      const invalidIds = cityIds.filter((id) => !Types.ObjectId.isValid(id));

      if (invalidIds.length > 0) {
        throw new Error(`Invalid cityIds: ${invalidIds.join(", ")}`);
      }
    }

    if (categoryIds?.length) {
      const invalidCategoryIds = categoryIds.filter(
        (id) => !Types.ObjectId.isValid(id),
      );

      if (invalidCategoryIds.length > 0) {
        throw new Error(
          `Invalid categoryIds: ${invalidCategoryIds.join(", ")}`,
        );
      }
    }

    try {
      if (cityIds?.length) {
        const locations = await Location.find({
          cityId: {
            $in: cityIds.map((id) => new Types.ObjectId(id)),
          },
          isActive: true,
        })
          .select("_id")
          .lean();

        const locationIds = locations.map((loc) => loc._id);

        matchQuery["locations.locationId"] = {
          $in: locationIds,
        };
      }

      if (categoryIds?.length) {
        matchQuery.categoryId = {
          $in: categoryIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (isActive !== undefined) {
        matchQuery.isActive = isActive;
      }

      if (isComplete !== undefined) {
        matchQuery.isComplete = isComplete;
      }

      const sortCriteria: any = {
        [sortBy]: sortOrder === "desc" ? -1 : 1,
      };

      const [data, total] = await Promise.all([
        Package.find(matchQuery)
          .select({
            name: 1,
            shortDescription: 1,
            thumbnailImage: 1,
            bannerImage: 1,
            categoryId: 1,
            isActive: 1,
            packageReference: 1,
            createdAt: 1,
            isComplete: 1,
            startingPrice: 1,
            locations: 1,
            tiers: 1,
          })
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean({ virtuals: true }),

        Package.countDocuments(matchQuery),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Fetching packages by location failed: ${error.message}`);
    }
  }

  static async exportPackagesToCsv(
    packageIds: string[],
  ) {
    if (
      !Array.isArray(packageIds) ||
      packageIds.length === 0
    ) {
      throw createHttpError(
        "At least one package ID is required",
        400,
      );
    }

    const uniquePackageIds = [
      ...new Set(
        packageIds,
      ),
    ];

    /*
     * Defensive validation.
     *
     * Route validation already catches this,
     * but service should remain safe if called
     * from somewhere else later.
     */
    for (
      const packageId of
      uniquePackageIds
    ) {
      if (
        !Types.ObjectId.isValid(
          packageId,
        )
      ) {
        throw createHttpError(
          `Invalid package ID: ${packageId}`,
          400,
        );
      }
    }

    const packages =
      await Package.find({
        _id: {
          $in:
            uniquePackageIds.map(
              (packageId) =>
                new Types.ObjectId(
                  packageId,
                ),
            ),
        },
      })
        .select(
          [
            "packageReference",
            "name",
            "shortDescription",
            "categoryId",
            "isActive",
            "isComplete",
            "startingPrice",
            "locations",
            "tiers",
            "createdAt",
            "updatedAt",
          ].join(" "),
        )
        .populate({
          path:
            "categoryId",

          select:
            "label value",
        })
        .lean();

    if (
      packages.length === 0
    ) {
      throw createHttpError(
        "No packages found for export",
        404,
      );
    }

    const escapeCsv = (
      value: unknown,
    ): string => {
      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }

      const stringValue =
        String(value);

      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        return `"${stringValue.replace(
          /"/g,
          '""',
        )}"`;
      }

      return stringValue;
    };

    const headers = [
      "Package Reference",
      "Package Name",
      "Short Description",
      "Category",
      "Category Value",
      "Active",
      "Complete",
      "Starting Price",
      "Location Count",
      "Active Location Count",
      "Locations",
      "Tier Count",
      "Tiers",
      "Created At",
      "Updated At",
    ];

    const rows =
      packages.map(
        (pkg: any) => {
          const locations =
            pkg.locations ??
            [];

          const tiers =
            pkg.tiers ??
            [];

          const activeLocations =
            locations.filter(
              (location: any) =>
                location.isActive,
            );

          const locationNames =
            locations
              .map(
                (location: any) =>
                  location.name,
              )
              .filter(Boolean)
              .join(" | ");

          const tierNames =
            tiers
              .map(
                (tier: any) =>
                  tier.name,
              )
              .filter(Boolean)
              .join(" | ");

          const category =
            pkg.categoryId &&
              typeof pkg.categoryId ===
              "object"
              ? pkg.categoryId
              : null;

          return [
            pkg.packageReference,

            pkg.name,

            pkg.shortDescription,

            category?.label ??
            "",

            category?.value ??
            "",

            pkg.isActive,

            pkg.isComplete,

            pkg.startingPrice,

            locations.length,

            activeLocations.length,

            locationNames,

            tiers.length,

            tierNames,

            pkg.createdAt
              ? new Date(
                pkg.createdAt,
              ).toISOString()
              : "",

            pkg.updatedAt
              ? new Date(
                pkg.updatedAt,
              ).toISOString()
              : "",
          ];
        },
      );

    const csv = [
      headers
        .map(
          escapeCsv,
        )
        .join(","),

      ...rows.map(
        (row) =>
          row
            .map(
              escapeCsv,
            )
            .join(","),
      ),
    ].join("\n");

    return {
      csv,
      total:
        packages.length,
    };
  }
}
