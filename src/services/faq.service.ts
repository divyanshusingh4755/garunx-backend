import { Types } from "mongoose";

import { FAQ, type IFAQ } from "../models/faq.model.js";

import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

type FaqType = "User" | "Coordinator" | "User_Query" | "Coordinator_Query";

type FaqUpdateData = Partial<
  Pick<
    IFAQ,
    | "name"
    | "question"
    | "answer"
    | "faqType"
    | "displayOrder"
  >
>;

type SortSpecification = Record<string, 1 | -1 | { $meta: "textScore" }>;

type ProjectionSpecification = Record<string, 0 | 1 | { $meta: "textScore" }>;

export class FAQService {
  private static async invalidateFaqCache(
    faqId?: string,
  ): Promise<void> {
    const operations: Promise<unknown>[] = [
      RedisCacheService.deleteByPattern(
        CacheKeys.faqListPattern(),
      ),
    ];

    if (faqId) {
      operations.push(
        RedisCacheService.delete(
          CacheKeys.faqDetail(
            faqId,
          ),
        ),
      );
    }

    await Promise.all(
      operations,
    );
  }

  private static ensureValidId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid FAQ ID");
    }
  }

  static async createFaq(
    faqData: Partial<IFAQ>,
  ) {
    if (!faqData.name?.trim()) {
      throw new Error(
        "Name is required",
      );
    }

    if (!faqData.question?.trim()) {
      throw new Error(
        "Question is required",
      );
    }

    if (!faqData.answer?.trim()) {
      throw new Error(
        "Answer is required",
      );
    }

    const faq =
      new FAQ(
        faqData,
      );

    const savedFaq =
      await faq.save();

    await this.invalidateFaqCache();

    return savedFaq;
  }

  static async updateFaq(
    id: string,
    updateData: FaqUpdateData,
  ) {
    this.ensureValidId(
      id,
    );

    const faq =
      await FAQ.findById(
        id,
      );

    if (!faq) {
      throw new Error(
        "FAQ not found",
      );
    }

    for (
      const [
        field,
        value,
      ] of Object.entries(
        updateData,
      )
    ) {
      faq.set(
        field,
        value,
      );
    }

    const updatedFaq =
      await faq.save();

    await this.invalidateFaqCache(
      id,
    );

    return updatedFaq;
  }

  static async getFaqById(
    id: string,
  ) {
    this.ensureValidId(
      id,
    );

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.faqDetail(
          id,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .FAQ_DETAIL,

      loader:
        async () => {
          const faq =
            await FAQ.findById(
              id,
            ).lean();

          if (!faq) {
            throw new Error(
              "FAQ not found",
            );
          }

          return faq;
        },
    });
  }

  static async deleteFaq(
    id: string,
  ) {
    this.ensureValidId(
      id,
    );

    const faq =
      await FAQ.findByIdAndDelete(
        id,
      );

    if (!faq) {
      throw new Error(
        "FAQ not found",
      );
    }

    await this.invalidateFaqCache(
      id,
    );

    return faq;
  }

  static async toggleFaqStatus(
    id: string,
  ) {
    this.ensureValidId(
      id,
    );

    const faq =
      await FAQ.findById(
        id,
      );

    if (!faq) {
      throw new Error(
        "FAQ not found",
      );
    }

    faq.isActive =
      !faq.isActive;

    const updatedFaq =
      await faq.save();

    await this.invalidateFaqCache(
      id,
    );

    return updatedFaq;
  }

  static async findFaqs(
    searchTerm?: string,
    faqType?: string,
    limit = 20,
    page = 1,
    isActive?: boolean,
    sortBy = "displayOrder",
    sortOrder: "asc" | "desc" = "asc",
  ) {
    const safeLimit =
      Number.isInteger(limit) &&
        limit > 0
        ? Math.min(
          limit,
          100,
        )
        : 20;

    const safePage =
      Number.isInteger(page) &&
        page > 0
        ? page
        : 1;

    const normalizedSearch =
      searchTerm?.trim();

    const isTextSearch =
      Boolean(
        normalizedSearch &&
        normalizedSearch.length > 4,
      );

    const allowedSortFields =
      new Set([
        "displayOrder",
        "createdAt",
        "updatedAt",
        "name",
        "faqType",
        "isActive",
        "relevance",
      ]);

    const safeSortBy =
      allowedSortFields.has(
        sortBy,
      )
        ? sortBy
        : "displayOrder";

    const effectiveSortBy =
      safeSortBy === "relevance" &&
        !isTextSearch
        ? "displayOrder"
        : safeSortBy;

    const cacheKey =
      CacheKeys.faqList({
        searchTerm:
          normalizedSearch,

        faqType,

        limit:
          safeLimit,

        page:
          safePage,

        isActive,

        sortBy:
          effectiveSortBy,

        sortOrder,
      });

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .FAQ_LIST,

      loader:
        async () => {
          const skip =
            safeLimit *
            (safePage - 1);

          const query:
            Record<
              string,
              unknown
            > = {};

          if (faqType) {
            query.faqType =
              faqType as FaqType;
          }

          if (
            typeof isActive ===
            "boolean"
          ) {
            query.isActive =
              isActive;
          }

          if (
            normalizedSearch
          ) {
            if (
              isTextSearch
            ) {
              query.$text = {
                $search:
                  normalizedSearch,
              };
            } else {
              query.name = {
                $regex:
                  `^${escapeRegex(
                    normalizedSearch,
                  )}`,

                $options:
                  "i",
              };
            }
          }

          let projection:
            ProjectionSpecification =
            {};

          let sortCriteria:
            SortSpecification;

          if (
            isTextSearch &&
            effectiveSortBy ===
            "relevance"
          ) {
            projection = {
              score: {
                $meta:
                  "textScore",
              },
            };

            sortCriteria = {
              score: {
                $meta:
                  "textScore",
              },
            };
          } else {
            sortCriteria = {
              [effectiveSortBy]:
                sortOrder ===
                  "desc"
                  ? -1
                  : 1,
            };

            if (
              effectiveSortBy !==
              "createdAt"
            ) {
              sortCriteria.createdAt =
                -1;
            }
          }

          try {
            const [
              data,
              total,
            ] =
              await Promise.all([
                FAQ.find(
                  query,
                  projection,
                )
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

                FAQ.countDocuments(
                  query,
                ),
              ]);

            return {
              data,
              total,

              page:
                safePage,

              limit:
                safeLimit,

              totalPages:
                Math.ceil(
                  total /
                  safeLimit,
                ),
            };
          } catch (
          error:
            unknown
          ) {
            const message =
              error instanceof Error
                ? error.message
                : "Unknown error";

            throw new Error(
              `FAQ fetch failed: ${message}`,
            );
          }
        },
    });
  }

  static async exportFaqsToCsv(
    faqIds: string[],
  ) {
    if (
      !Array.isArray(
        faqIds,
      ) ||
      faqIds.length ===
      0
    ) {
      throw new Error(
        "At least one FAQ ID is required",
      );
    }

    if (
      faqIds.length >
      1000
    ) {
      throw new Error(
        "A maximum of 1000 FAQs can be exported at once",
      );
    }

    const uniqueFaqIds = [
      ...new Set(
        faqIds,
      ),
    ];

    for (
      const faqId of
      uniqueFaqIds
    ) {
      if (
        !Types.ObjectId.isValid(
          faqId,
        )
      ) {
        throw new Error(
          "Invalid FAQ ID",
        );
      }
    }

    const faqObjectIds =
      uniqueFaqIds.map(
        (
          faqId,
        ) =>
          new Types.ObjectId(
            faqId,
          ),
      );

    const faqs =
      await FAQ.find({
        _id: {
          $in:
            faqObjectIds,
        },
      })
        .select(
          [
            "version",
            "name",
            "question",
            "answer",
            "faqType",
            "isActive",
            "displayOrder",
            "createdAt",
            "updatedAt",
          ].join(
            " ",
          ),
        )
        .lean();

    if (
      faqs.length ===
      0
    ) {
      throw new Error(
        "No FAQs found for export",
      );
    }

    /*
     * Preserve the same order in which
     * IDs were received from frontend.
     */
    const faqMap =
      new Map(
        faqs.map(
          (
            faq,
          ) => [
              faq._id
                .toString(),

              faq,
            ],
        ),
      );

    const orderedFaqs =
      uniqueFaqIds
        .map(
          (
            faqId,
          ) =>
            faqMap.get(
              faqId,
            ),
        )
        .filter(
          (
            faq,
          ): faq is NonNullable<
            typeof faq
          > =>
            Boolean(
              faq,
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
       * Protect spreadsheet applications
       * from formula injection.
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
      "FAQ ID",
      "Version",
      "Name",
      "Question",
      "Answer",
      "FAQ Type",
      "Active",
      "Display Order",
      "Created At",
      "Updated At",
    ];

    const rows =
      orderedFaqs.map(
        (
          faq,
        ) => [
            faq._id
              .toString(),

            faq.version,

            faq.name,

            faq.question,

            faq.answer,

            faq.faqType,

            faq.isActive,

            faq.displayOrder,

            formatDate(
              faq.createdAt,
            ),

            formatDate(
              faq.updatedAt,
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
        orderedFaqs.length,
    };
  }
}
