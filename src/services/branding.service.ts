import mongoose, { Types, type HydratedDocument } from "mongoose";

import {
  Branding,
  type IBrand,
  type IBrandTheme,
} from "../models/branding.model.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

class BrandingService {
  static async getAppTheme():
    Promise<IBrandTheme> {
    return RedisCacheService.getOrSet<IBrandTheme>({
      key:
        CacheKeys.brandingTheme(),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .BRANDING_THEME,

      loader:
        async () => {
          const branding =
            await Branding.findOne({
              isActive:
                true,
            })
              .sort({
                version:
                  -1,
              })
              .lean();

          if (
            !branding
          ) {
            throw new Error(
              "No active theme found",
            );
          }

          return branding.theme;
        },
    });
  }

  static async updateAppTheme(
    newTheme: Partial<IBrandTheme>,
  ): Promise<HydratedDocument<IBrand>> {
    if (
      !newTheme ||
      typeof newTheme !== "object" ||
      Array.isArray(newTheme) ||
      Object.keys(newTheme).length === 0
    ) {
      throw new Error(
        "At least one theme field is required",
      );
    }

    const session =
      await mongoose.startSession();

    let createdBranding:
      HydratedDocument<IBrand> | null =
      null;

    try {
      await session.withTransaction(
        async () => {
          const latest =
            await Branding.findOne()
              .sort({
                version: -1,
              })
              .session(session)
              .lean();

          const currentTheme: IBrandTheme =
            latest?.theme ?? {
              primary: "#007bff",
              secondary: "#6c757d",
              accent: "#ffc107",
              background: "#ffffff",
              text: "#212259",
            };

          const mergedTheme: IBrandTheme = {
            primary:
              newTheme.primary ??
              currentTheme.primary,

            secondary:
              newTheme.secondary ??
              currentTheme.secondary,

            accent:
              newTheme.accent ??
              currentTheme.accent,

            background:
              newTheme.background ??
              currentTheme.background,

            text:
              newTheme.text ??
              currentTheme.text,
          };

          const nextVersion =
            latest
              ? latest.version + 1
              : 1;

          await Branding.updateMany(
            {
              isActive: true,
            },
            {
              $set: {
                isActive: false,
              },
            },
            {
              session,
            },
          );

          const createdDocuments =
            await Branding.create(
              [
                {
                  version: nextVersion,
                  isActive: true,
                  theme: mergedTheme,
                },
              ],
              {
                session,
              },
            );

          createdBranding =
            createdDocuments[0] ?? null;

          if (!createdBranding) {
            throw new Error(
              "Theme creation failed",
            );
          }
        },
      );
    } finally {
      await session.endSession();
    }

    if (!createdBranding) {
      throw new Error(
        "Theme creation failed",
      );
    }

    return createdBranding;
  }

  static async exportBrandingToCsv(
    brandingIds: string[],
  ) {
    if (
      !Array.isArray(
        brandingIds,
      ) ||
      brandingIds.length ===
      0
    ) {
      throw new Error(
        "At least one branding ID is required",
      );
    }

    if (
      brandingIds.length >
      1000
    ) {
      throw new Error(
        "A maximum of 1000 branding records can be exported at once",
      );
    }

    const uniqueBrandingIds = [
      ...new Set(
        brandingIds,
      ),
    ];

    for (
      const brandingId of
      uniqueBrandingIds
    ) {
      if (
        !Types.ObjectId.isValid(
          brandingId,
        )
      ) {
        throw new Error(
          "Invalid branding ID",
        );
      }
    }

    const brandingObjectIds =
      uniqueBrandingIds.map(
        (
          brandingId,
        ) =>
          new Types.ObjectId(
            brandingId,
          ),
      );

    const brandingRecords =
      await Branding.find({
        _id: {
          $in:
            brandingObjectIds,
        },
      })
        .select(
          [
            "version",
            "isActive",
            "theme",
            "createdAt",
            "updatedAt",
          ].join(
            " ",
          ),
        )
        .lean();

    if (
      brandingRecords.length ===
      0
    ) {
      throw new Error(
        "Branding records not found for export",
      );
    }

    /*
     * Preserve the same order in which
     * the frontend selected the records.
     */
    const brandingMap =
      new Map(
        brandingRecords.map(
          (
            branding,
          ) => [
              branding._id
                .toString(),

              branding,
            ],
        ),
      );

    const orderedBranding =
      uniqueBrandingIds
        .map(
          (
            brandingId,
          ) =>
            brandingMap.get(
              brandingId,
            ),
        )
        .filter(
          (
            branding,
          ): branding is NonNullable<
            typeof branding
          > =>
            Boolean(
              branding,
            ),
        );

    const escapeCsv = (
      value: unknown,
    ): string => {
      if (
        value ===
        null ||
        value ===
        undefined
      ) {
        return "";
      }

      const stringValue =
        String(
          value,
        );

      /*
       * Protect against spreadsheet
       * formula injection.
       */
      const safeValue =
        /^[=+\-@]/.test(
          stringValue,
        )
          ? `'${stringValue}`
          : stringValue;

      if (
        safeValue.includes(
          ",",
        ) ||
        safeValue.includes(
          '"',
        ) ||
        safeValue.includes(
          "\n",
        ) ||
        safeValue.includes(
          "\r",
        )
      ) {
        return `"${safeValue.replace(
          /"/g,
          '""',
        )}"`;
      }

      return safeValue;
    };

    const formatDate = (
      value:
        Date |
        string |
        null |
        undefined,
    ): string => {
      if (!value) {
        return "";
      }

      const date =
        new Date(
          value,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return "";
      }

      return date
        .toISOString();
    };

    const headers = [
      "Branding ID",
      "Version",
      "Active",
      "Primary Color",
      "Secondary Color",
      "Accent Color",
      "Background Color",
      "Text Color",
      "Created At",
      "Updated At",
    ];

    const rows =
      orderedBranding.map(
        (
          branding,
        ) => [
            branding._id
              .toString(),

            branding.version,

            branding.isActive,

            branding.theme
              .primary,

            branding.theme
              .secondary,

            branding.theme
              .accent,

            branding.theme
              .background,

            branding.theme
              .text,

            formatDate(
              branding.createdAt,
            ),

            formatDate(
              branding.updatedAt,
            ),
          ],
      );

    const csv = [
      headers
        .map(
          escapeCsv,
        )
        .join(
          ",",
        ),

      ...rows.map(
        (
          row,
        ) =>
          row
            .map(
              escapeCsv,
            )
            .join(
              ",",
            ),
      ),
    ].join(
      "\n",
    );

    return {
      csv,

      total:
        orderedBranding.length,
    };
  }
}

export default BrandingService;
