import mongoose, { Types, type ClientSession } from "mongoose";

import { Booking } from "../models/booking.model.js";

import {
  Review,
  type ReviewDirection,
  type ReviewModerationStatus,
  type ReviewVisibility,
} from "../models/review.model.js";

import { User } from "../models/user.model.js";

import { escapeRegex } from "../utils/escapeRegex.js";
import { OutboxService } from "./outbox.service.js";
import { DOMAIN_EVENTS } from "../events/domain-events.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

interface AdjustRatingAggregateInput {
  revieweeId: Types.ObjectId;
  direction: ReviewDirection;
  ratingDelta: number;
  countDelta: number;
  session: ClientSession;
}

interface CreateReviewInput {
  bookingId: string;
  reviewerId: string;
  rating: number;
  review?: string | null;
  imageUrl?: string | null;
}

interface EditReviewInput {
  reviewId: string;
  reviewerId: string;
  rating?: number;
  review?: string | null;
  imageUrl?: string | null;
}

interface ReviewParticipants {
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  direction: ReviewDirection;
}

export type ReviewModerationAction =
  | "HIDE"
  | "UNPUBLISH"
  | "PUBLISH"
  | "FLAG"
  | "UNFLAG"
  | "DELETE";

interface ModerateReviewInput {
  reviewId: string;
  adminId: string;
  action: ReviewModerationAction;
  reason?: string | null;
}

type ReviewQuery = Record<string, unknown>;

type SortSpecification = Record<string, 1 | -1>;

export class ReviewService {
  private static async invalidateReviewCache(): Promise<void> {
    await Promise.all([
      RedisCacheService.deleteByPattern(
        CacheKeys.reviewListPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.myBookingReviewPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.myReviewListPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.coordinatorReviewListPattern(),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.bookingListPattern(),
      ),
    ]);
  }

  private static safePagination(
    page: number,
    limit: number,
    defaultLimit: number,
  ) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;

    const safeLimit =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : defaultLimit;

    return {
      safePage,
      safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  private static getSortCriteria(
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): SortSpecification {
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "rating",
      "editedAt",
    ]);

    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";

    const sortCriteria: SortSpecification = {
      [safeSortBy]: sortOrder === "asc" ? 1 : -1,
    };

    if (safeSortBy !== "createdAt") {
      sortCriteria.createdAt = -1;
    }

    return sortCriteria;
  }

  private static async adjustRatingAggregate(
    input: AdjustRatingAggregateInput,
  ): Promise<void> {
    const {
      revieweeId,
      direction,
      ratingDelta,
      countDelta,
      session,
    } = input;

    /*
     * CUSTOMER -> COORDINATOR
     *
     * Update ratingSum, totalRatings and averageRating
     * atomically inside MongoDB.
     *
     * This prevents lost updates when multiple reviews
     * are created/edited/moderated concurrently.
     */
    if (
      direction ===
      "CUSTOMER_TO_COORDINATOR"
    ) {
      const result =
        await User.updateOne(
          {
            _id:
              revieweeId,

            coordinatorProfile: {
              $exists:
                true,
            },

            /*
             * Do not allow the aggregate to become negative.
             *
             * This is especially important when a review is
             * hidden, unpublished or deleted and its rating
             * is being subtracted.
             */
            $expr: {
              $and: [
                {
                  $gte: [
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$coordinatorProfile.ratingSum",
                            0,
                          ],
                        },
                        ratingDelta,
                      ],
                    },
                    0,
                  ],
                },

                {
                  $gte: [
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$coordinatorProfile.totalRatings",
                            0,
                          ],
                        },
                        countDelta,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
          },

          [
            {
              $set: {
                "coordinatorProfile.ratingSum": {
                  $let: {
                    vars: {
                      newRatingSum: {
                        $add: [
                          {
                            $ifNull: [
                              "$coordinatorProfile.ratingSum",
                              0,
                            ],
                          },
                          ratingDelta,
                        ],
                      },

                      newTotalRatings: {
                        $add: [
                          {
                            $ifNull: [
                              "$coordinatorProfile.totalRatings",
                              0,
                            ],
                          },
                          countDelta,
                        ],
                      },
                    },

                    in: {
                      $cond: [
                        {
                          $eq: [
                            "$$newTotalRatings",
                            0,
                          ],
                        },
                        0,
                        "$$newRatingSum",
                      ],
                    },
                  },
                },

                "coordinatorProfile.totalRatings": {
                  $add: [
                    {
                      $ifNull: [
                        "$coordinatorProfile.totalRatings",
                        0,
                      ],
                    },
                    countDelta,
                  ],
                },

                "coordinatorProfile.averageRating": {
                  $let: {
                    vars: {
                      newRatingSum: {
                        $add: [
                          {
                            $ifNull: [
                              "$coordinatorProfile.ratingSum",
                              0,
                            ],
                          },
                          ratingDelta,
                        ],
                      },

                      newTotalRatings: {
                        $add: [
                          {
                            $ifNull: [
                              "$coordinatorProfile.totalRatings",
                              0,
                            ],
                          },
                          countDelta,
                        ],
                      },
                    },

                    in: {
                      $cond: [
                        {
                          $gt: [
                            "$$newTotalRatings",
                            0,
                          ],
                        },

                        {
                          $divide: [
                            "$$newRatingSum",
                            "$$newTotalRatings",
                          ],
                        },

                        0,
                      ],
                    },
                  },
                },
              },
            },
          ],

          {
            session,
            updatePipeline: true,
          },
        );

      if (
        result.matchedCount === 0
      ) {
        /*
         * Only run an additional read when something
         * abnormal occurred. Normal rating updates
         * remain a single atomic database operation.
         */
        const reviewee =
          await User.findById(
            revieweeId,
          )
            .select(
              "_id coordinatorProfile",
            )
            .session(
              session,
            );

        if (!reviewee) {
          throw new Error(
            "Reviewee not found",
          );
        }

        if (
          !reviewee.coordinatorProfile
        ) {
          throw new Error(
            "Coordinator profile not found",
          );
        }

        throw new Error(
          "Invalid coordinator rating aggregate state",
        );
      }

      return;
    }

    /*
     * COORDINATOR -> CUSTOMER
     *
     * ratingSummary is allowed to be absent, therefore
     * $ifNull treats an uninitialized summary as 0 / 0.
     */
    if (
      direction ===
      "COORDINATOR_TO_CUSTOMER"
    ) {
      const result =
        await User.updateOne(
          {
            _id:
              revieweeId,

            $expr: {
              $and: [
                {
                  $gte: [
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$ratingSummary.ratingSum",
                            0,
                          ],
                        },
                        ratingDelta,
                      ],
                    },
                    0,
                  ],
                },

                {
                  $gte: [
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$ratingSummary.totalRatings",
                            0,
                          ],
                        },
                        countDelta,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
          },

          [
            {
              $set: {
                ratingSummary: {
                  $let: {
                    vars: {
                      newRatingSum: {
                        $add: [
                          {
                            $ifNull: [
                              "$ratingSummary.ratingSum",
                              0,
                            ],
                          },
                          ratingDelta,
                        ],
                      },

                      newTotalRatings: {
                        $add: [
                          {
                            $ifNull: [
                              "$ratingSummary.totalRatings",
                              0,
                            ],
                          },
                          countDelta,
                        ],
                      },
                    },

                    in: {
                      ratingSum: {
                        $cond: [
                          {
                            $eq: [
                              "$$newTotalRatings",
                              0,
                            ],
                          },
                          0,
                          "$$newRatingSum",
                        ],
                      },

                      totalRatings:
                        "$$newTotalRatings",

                      averageRating: {
                        $cond: [
                          {
                            $gt: [
                              "$$newTotalRatings",
                              0,
                            ],
                          },

                          {
                            $divide: [
                              "$$newRatingSum",
                              "$$newTotalRatings",
                            ],
                          },

                          0,
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],

          {
            session,
            updatePipeline: true,
          },
        );

      if (
        result.matchedCount === 0
      ) {
        const reviewee =
          await User.findById(
            revieweeId,
          )
            .select(
              "_id ratingSummary",
            )
            .session(
              session,
            );

        if (!reviewee) {
          throw new Error(
            "Reviewee not found",
          );
        }

        throw new Error(
          "Invalid customer rating aggregate state",
        );
      }

      return;
    }

    throw new Error(
      "Invalid review direction",
    );
  }

  private static resolveReviewParticipants(
    booking: {
      userId?: Types.ObjectId;
      assignment?: {
        assignedCoordinatorId?: Types.ObjectId;
      };
    },
    loggedInUserId: Types.ObjectId,
  ): ReviewParticipants {
    const customerId = booking.userId;

    const coordinatorId = booking.assignment?.assignedCoordinatorId;

    if (!customerId) {
      throw new Error("Customer is not associated with this booking");
    }

    if (!coordinatorId) {
      throw new Error("Coordinator is not assigned to this booking");
    }

    if (customerId.equals(loggedInUserId)) {
      return {
        reviewerId: customerId,
        revieweeId: coordinatorId,
        direction: "CUSTOMER_TO_COORDINATOR",
      };
    }

    if (coordinatorId.equals(loggedInUserId)) {
      return {
        reviewerId: coordinatorId,
        revieweeId: customerId,
        direction: "COORDINATOR_TO_CUSTOMER",
      };
    }

    throw new Error("You are not authorized to review this booking");
  }

  static async getAllReviews(params: {
    searchTerm?: string;
    direction?: ReviewDirection;
    visibility?: ReviewVisibility;
    moderationStatus?: ReviewModerationStatus;
    isDeleted?: boolean;
    rating?: number;
    reviewerId?: string;
    revieweeId?: string;
    bookingId?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      searchTerm,
      direction,
      visibility,
      moderationStatus,
      isDeleted,
      rating,
      reviewerId,
      revieweeId,
      bookingId,
      limit = 40,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    /*
     * Normalize pagination first.
     */
    const {
      safePage,
      safeLimit,
      skip,
    } = this.safePagination(
      page,
      limit,
      40,
    );

    /*
     * Validate IDs before creating
     * the Redis cache key.
     */
    if (
      reviewerId &&
      !Types.ObjectId.isValid(
        reviewerId,
      )
    ) {
      throw new Error(
        "Invalid reviewer id",
      );
    }

    if (
      revieweeId &&
      !Types.ObjectId.isValid(
        revieweeId,
      )
    ) {
      throw new Error(
        "Invalid reviewee id",
      );
    }

    if (
      bookingId &&
      !Types.ObjectId.isValid(
        bookingId,
      )
    ) {
      throw new Error(
        "Invalid booking id",
      );
    }

    /*
     * Normalize the sort field so the
     * cache key represents the actual
     * MongoDB query.
     */
    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "rating",
        "editedAt",
      ]);

    const safeSortBy =
      allowedSortFields.has(
        sortBy,
      )
        ? sortBy
        : "createdAt";

    const cacheKey =
      CacheKeys.reviewList({
        searchTerm,
        direction,
        visibility,
        moderationStatus,
        isDeleted,
        rating,
        reviewerId,
        revieweeId,
        bookingId,

        limit:
          safeLimit,

        page:
          safePage,

        sortBy:
          safeSortBy,

        sortOrder,
      });

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .REVIEW_LIST,

      loader:
        async () => {
          const query:
            ReviewQuery = {};

          if (
            direction
          ) {
            query.direction =
              direction;
          }

          if (
            visibility
          ) {
            query.visibility =
              visibility;
          }

          if (
            moderationStatus
          ) {
            query.moderationStatus =
              moderationStatus;
          }

          if (
            typeof isDeleted ===
            "boolean"
          ) {
            query.isDeleted =
              isDeleted;
          }

          if (
            rating !==
            undefined
          ) {
            query.rating =
              rating;
          }

          if (
            reviewerId
          ) {
            query.reviewerId =
              new Types.ObjectId(
                reviewerId,
              );
          }

          if (
            revieweeId
          ) {
            query.revieweeId =
              new Types.ObjectId(
                revieweeId,
              );
          }

          if (
            bookingId
          ) {
            query.bookingId =
              new Types.ObjectId(
                bookingId,
              );
          }

          if (
            searchTerm
              ?.trim()
          ) {
            query.review = {
              $regex:
                escapeRegex(
                  searchTerm.trim(),
                ),

              $options:
                "i",
            };
          }

          const sortCriteria =
            this.getSortCriteria(
              safeSortBy,
              sortOrder,
            );

          try {
            const [
              data,
              total,
            ] =
              await Promise.all([
                Review.find(
                  query,
                )
                  .populate(
                    "reviewerId",
                    "fullName profileImage role userReference",
                  )
                  .populate(
                    "revieweeId",
                    "fullName profileImage role userReference",
                  )
                  .populate(
                    "bookingId",
                    "bookingReference status completedAt",
                  )
                  .populate(
                    "moderatedBy",
                    "fullName role userReference",
                  )
                  .populate(
                    "deletedBy",
                    "fullName role userReference",
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

                Review.countDocuments(
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
              error instanceof
                Error
                ? error.message
                : "Unknown error";

            throw new Error(
              `Review fetch failed: ${message}`,
            );
          }
        },
    });
  }

  static async createReviewService(input: CreateReviewInput) {
    const { bookingId, reviewerId, rating, review, imageUrl } = input;

    if (!Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking id");
    }

    if (!Types.ObjectId.isValid(reviewerId)) {
      throw new Error("Invalid reviewer id");
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const bookingObjectId = new Types.ObjectId(bookingId);

    const reviewerObjectId = new Types.ObjectId(reviewerId);

    const session = await mongoose.startSession();

    try {
      let createdReview = null;

      await session.withTransaction(async () => {
        const booking = await Booking.findOne({
          _id: bookingObjectId,
          isDeleted: false,
        }).session(session);

        if (!booking) {
          throw new Error("Booking not found");
        }

        if (booking.status !== "COMPLETED") {
          throw new Error(
            "Review can only be submitted after booking completion",
          );
        }

        const participants = this.resolveReviewParticipants(
          booking,
          reviewerObjectId,
        );

        const existingReview = await Review.findOne({
          bookingId: booking._id,
          reviewerId: participants.reviewerId,
        })
          .select("_id")
          .session(session)
          .lean();

        if (existingReview) {
          throw new Error("You have already reviewed this booking");
        }

        const [reviewDocument] = await Review.create(
          [
            {
              bookingId: booking._id,
              reviewerId: participants.reviewerId,
              revieweeId: participants.revieweeId,
              direction: participants.direction,
              rating,
              review: review ?? null,
              imageUrl: imageUrl ?? null,
            },
          ],
          { session },
        );

        if (!reviewDocument) {
          throw new Error("Failed to create review");
        }

        await this.adjustRatingAggregate({
          revieweeId: participants.revieweeId,
          direction: participants.direction,
          ratingDelta: rating,
          countDelta: 1,
          session,
        });

        await OutboxService.createEvent({
          eventId:
            `REVIEW.CREATED:${reviewDocument._id.toString()}`,

          eventType:
            DOMAIN_EVENTS.REVIEW_CREATED,

          aggregateType:
            "REVIEW",

          aggregateId:
            reviewDocument._id.toString(),

          payload: {
            reviewId:
              reviewDocument._id.toString(),

            bookingId:
              booking._id.toString(),

            bookingReference:
              booking.bookingReference,

            reviewerId:
              participants.reviewerId.toString(),

            revieweeId:
              participants.revieweeId.toString(),

            direction:
              participants.direction,

            rating,
          },

          session,
        });

        createdReview = reviewDocument;
      });

      if (!createdReview) {
        throw new Error("Failed to create review");
      }

      await this.invalidateReviewCache();

      return createdReview;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new Error("You have already reviewed this booking");
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async editReviewService(input: EditReviewInput) {
    const { reviewId, reviewerId, rating, review, imageUrl } = input;

    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error("Invalid review id");
    }

    if (!Types.ObjectId.isValid(reviewerId)) {
      throw new Error("Invalid reviewer id");
    }

    if (
      rating !== undefined &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      throw new Error("Rating must be between 1 and 5");
    }

    const hasRating = Object.prototype.hasOwnProperty.call(input, "rating");

    const hasReview = Object.prototype.hasOwnProperty.call(input, "review");

    const hasImageUrl = Object.prototype.hasOwnProperty.call(input, "imageUrl");

    if (!hasRating && !hasReview && !hasImageUrl) {
      throw new Error("At least one field is required to update");
    }

    const reviewObjectId = new Types.ObjectId(reviewId);

    const reviewerObjectId = new Types.ObjectId(reviewerId);

    const session = await mongoose.startSession();

    try {
      let updatedReview = null;

      await session.withTransaction(async () => {
        const reviewDocument = await Review.findOne({
          _id: reviewObjectId,
          isDeleted: false,
        }).session(session);

        if (!reviewDocument) {
          throw new Error("Review not found");
        }

        if (!reviewDocument.reviewerId.equals(reviewerObjectId)) {
          throw new Error("You are not authorized to edit this review");
        }

        if (
          hasRating &&
          rating !== undefined &&
          rating !== reviewDocument.rating
        ) {
          const ratingDelta = rating - reviewDocument.rating;

          const contributesToRating =
            reviewDocument.visibility === "PUBLISHED" &&
            !reviewDocument.isDeleted;

          if (contributesToRating) {
            await this.adjustRatingAggregate({
              revieweeId: reviewDocument.revieweeId,
              direction: reviewDocument.direction,
              ratingDelta,
              countDelta: 0,
              session,
            });
          }

          reviewDocument.rating = rating;
        }

        if (hasReview) {
          reviewDocument.review = review ?? null;
        }

        if (hasImageUrl) {
          reviewDocument.imageUrl = imageUrl ?? null;
        }

        reviewDocument.editedAt = new Date();

        reviewDocument.editCount = reviewDocument.editCount + 1;

        updatedReview = await reviewDocument.save({
          session,
        });
      });

      if (!updatedReview) {
        throw new Error("Failed to update review");
      }

      await this.invalidateReviewCache();

      return updatedReview;
    } finally {
      await session.endSession();
    }
  }

  static async moderateReviewService(input: ModerateReviewInput) {
    const { reviewId, adminId, action, reason } = input;

    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error("Invalid review id");
    }

    if (!Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin id");
    }

    const reviewObjectId = new Types.ObjectId(reviewId);

    const adminObjectId = new Types.ObjectId(adminId);

    const session = await mongoose.startSession();

    try {
      let moderatedReview = null;

      await session.withTransaction(async () => {
        const reviewDocument =
          await Review.findById(reviewObjectId).session(session);

        if (!reviewDocument) {
          throw new Error("Review not found");
        }

        if (reviewDocument.isDeleted) {
          throw new Error("Deleted review cannot be moderated");
        }

        const wasContributing =
          reviewDocument.visibility === "PUBLISHED" &&
          !reviewDocument.isDeleted;

        switch (action) {
          case "HIDE":
            if (reviewDocument.visibility === "HIDDEN") {
              throw new Error("Review is already hidden");
            }

            reviewDocument.visibility = "HIDDEN";
            break;

          case "UNPUBLISH":
            if (reviewDocument.visibility === "UNPUBLISHED") {
              throw new Error("Review is already unpublished");
            }

            reviewDocument.visibility = "UNPUBLISHED";
            break;

          case "PUBLISH":
            reviewDocument.visibility =
              "PUBLISHED";

            reviewDocument.set(
              "moderationReason",
              undefined,
            );

            break;

          case "FLAG":
            reviewDocument.moderationStatus =
              "FLAGGED";

            if (reason) {
              reviewDocument.moderationReason =
                reason;
            }

            break;

          case "UNFLAG":
            reviewDocument.moderationStatus =
              "CLEAN";

            reviewDocument.set(
              "moderationReason",
              undefined,
            );

            break;

          case "DELETE":
            reviewDocument.isDeleted = true;
            reviewDocument.deletedBy = adminObjectId;
            reviewDocument.deletedAt = new Date();
            if (reason === null) {
              reviewDocument.set("deletionReason", undefined);
            } else if (reason !== undefined) {
              reviewDocument.deletionReason = reason;
            }
            break;

          default:
            throw new Error("Invalid moderation action");
        }

        const isContributing =
          reviewDocument.visibility === "PUBLISHED" &&
          !reviewDocument.isDeleted;

        if (wasContributing !== isContributing) {
          await this.adjustRatingAggregate({
            revieweeId: reviewDocument.revieweeId,
            direction: reviewDocument.direction,
            ratingDelta: isContributing
              ? reviewDocument.rating
              : -reviewDocument.rating,
            countDelta: isContributing ? 1 : -1,
            session,
          });
        }

        if (action !== "DELETE") {
          reviewDocument.moderatedBy = adminObjectId;
          reviewDocument.moderatedAt = new Date();

          if (reason !== undefined) {
            if (reason === null) {
              reviewDocument.set("moderationReason", undefined);
            } else {
              reviewDocument.moderationReason = reason;
            }
          }
        }

        moderatedReview = await reviewDocument.save({
          session,
        });

        if (action === "DELETE") {
          const booking =
            await Booking.findById(
              reviewDocument.bookingId,
            )
              .select(
                "_id bookingReference",
              )
              .session(session)
              .lean();

          await OutboxService.createEvent({
            eventId:
              `REVIEW.REMOVED_BY_ADMIN:${reviewDocument._id.toString()}:${reviewDocument.updatedAt.getTime()}`,

            eventType:
              DOMAIN_EVENTS.REVIEW_REMOVED_BY_ADMIN,

            aggregateType:
              "REVIEW",

            aggregateId:
              reviewDocument._id.toString(),

            payload: {
              reviewId:
                reviewDocument._id.toString(),

              bookingId:
                reviewDocument.bookingId.toString(),

              bookingReference:
                booking?.bookingReference ??
                "Unknown booking",

              reviewerId:
                reviewDocument.reviewerId.toString(),

              revieweeId:
                reviewDocument.revieweeId.toString(),

              direction:
                reviewDocument.direction,

              reason:
                reviewDocument.deletionReason ??
                "Removed by administrator",
            },

            session,
          });
        }
      });

      if (!moderatedReview) {
        throw new Error("Failed to moderate review");
      }

      await this.invalidateReviewCache();

      return moderatedReview;
    } finally {
      await session.endSession();
    }
  }

  static async getMyBookingReview(
    input: {
      bookingId: string;
      userId: string;
    },
  ) {
    const {
      bookingId,
      userId,
    } = input;

    if (
      !Types.ObjectId.isValid(
        bookingId,
      )
    ) {
      throw new Error(
        "Invalid booking id",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new Error(
        "Invalid user id",
      );
    }

    const cacheKey =
      CacheKeys.myBookingReview(
        bookingId,
        userId,
      );

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .MY_BOOKING_REVIEW,

      loader:
        async () => {
          const bookingObjectId =
            new Types.ObjectId(
              bookingId,
            );

          const userObjectId =
            new Types.ObjectId(
              userId,
            );

          const booking =
            await Booking.findOne({
              _id:
                bookingObjectId,

              isDeleted:
                false,
            })
              .select(
                "_id userId status assignment.assignedCoordinatorId bookingReference completedAt",
              )
              .lean();

          if (
            !booking
          ) {
            throw new Error(
              "Booking not found",
            );
          }

          const customerId =
            booking.userId;

          const coordinatorId =
            booking.assignment
              ?.assignedCoordinatorId;

          if (
            !customerId
          ) {
            throw new Error(
              "Customer is not associated with this booking",
            );
          }

          if (
            !coordinatorId
          ) {
            throw new Error(
              "Coordinator is not assigned to this booking",
            );
          }

          const isCustomer =
            customerId.equals(
              userObjectId,
            );

          const isCoordinator =
            coordinatorId.equals(
              userObjectId,
            );

          if (
            !isCustomer &&
            !isCoordinator
          ) {
            throw new Error(
              "You are not authorized to access review details for this booking",
            );
          }

          const review =
            await Review.findOne({
              bookingId:
                bookingObjectId,

              reviewerId:
                userObjectId,

              isDeleted:
                false,
            })
              .select(
                "rating review imageUrl direction visibility moderationStatus editedAt editCount createdAt updatedAt",
              )
              .lean();

          const hasReviewed =
            Boolean(
              review,
            );

          return {
            booking: {
              _id:
                booking._id,

              bookingReference:
                booking.bookingReference,

              status:
                booking.status,

              completedAt:
                booking.completedAt,
            },

            role:
              isCustomer
                ? "USER"
                : "COORDINATOR",

            canReview:
              booking.status ===
              "COMPLETED" &&
              !hasReviewed,

            hasReviewed,

            review:
              review ??
              null,
          };
        },
    });
  }

  static async getMyReviews(params: {
    userId: string;
    rating?: number;
    direction?: ReviewDirection;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      userId,
      rating,
      direction,
      limit = 20,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new Error(
        "Invalid user id",
      );
    }

    const {
      safePage,
      safeLimit,
      skip,
    } =
      this.safePagination(
        page,
        limit,
        20,
      );

    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "rating",
        "editedAt",
      ]);

    const safeSortBy =
      allowedSortFields.has(
        sortBy,
      )
        ? sortBy
        : "createdAt";

    const cacheKey =
      CacheKeys.myReviewList({
        userId,
        rating,
        direction,

        limit:
          safeLimit,

        page:
          safePage,

        sortBy:
          safeSortBy,

        sortOrder,
      });

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .MY_REVIEW_LIST,

      loader:
        async () => {
          const query:
            ReviewQuery = {
            reviewerId:
              new Types.ObjectId(
                userId,
              ),

            isDeleted:
              false,
          };

          if (
            rating !==
            undefined
          ) {
            query.rating =
              rating;
          }

          if (
            direction
          ) {
            query.direction =
              direction;
          }

          const sortCriteria =
            this.getSortCriteria(
              safeSortBy,
              sortOrder,
            );

          try {
            const [
              data,
              total,
            ] =
              await Promise.all([
                Review.find(
                  query,
                )
                  .populate(
                    "revieweeId",
                    "fullName profileImage role userReference",
                  )
                  .populate(
                    "bookingId",
                    "bookingReference status completedAt scheduledAt",
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

                Review.countDocuments(
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
              error instanceof
                Error
                ? error.message
                : "Unknown error";

            throw new Error(
              `My reviews fetch failed: ${message}`,
            );
          }
        },
    });
  }

  static async getCoordinatorReviews(params: {
    coordinatorId: string;
    rating?: number;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      coordinatorId,
      rating,
      limit = 20,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    if (
      !Types.ObjectId.isValid(
        coordinatorId,
      )
    ) {
      throw new Error(
        "Invalid coordinator id",
      );
    }

    const {
      safePage,
      safeLimit,
      skip,
    } =
      this.safePagination(
        page,
        limit,
        20,
      );

    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "rating",
        "editedAt",
      ]);

    const safeSortBy =
      allowedSortFields.has(
        sortBy,
      )
        ? sortBy
        : "createdAt";

    const cacheKey =
      CacheKeys.coordinatorReviewList({
        coordinatorId,
        rating,

        limit:
          safeLimit,

        page:
          safePage,

        sortBy:
          safeSortBy,

        sortOrder,
      });

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .COORDINATOR_REVIEW_LIST,

      loader:
        async () => {
          const coordinatorObjectId =
            new Types.ObjectId(
              coordinatorId,
            );

          /*
           * This coordinator data contains
           * the aggregate rating and therefore
           * benefits from the same cache entry
           * as the reviews.
           */
          const coordinator =
            await User.findById(
              coordinatorObjectId,
            )
              .select(
                "fullName profileImage role userReference coordinatorProfile.averageRating coordinatorProfile.totalRatings",
              )
              .lean();

          if (
            !coordinator
          ) {
            throw new Error(
              "Coordinator not found",
            );
          }

          if (
            !coordinator
              .coordinatorProfile
          ) {
            throw new Error(
              "Coordinator profile not found",
            );
          }

          const query:
            ReviewQuery = {
            revieweeId:
              coordinatorObjectId,

            direction:
              "CUSTOMER_TO_COORDINATOR",

            visibility:
              "PUBLISHED",

            isDeleted:
              false,
          };

          if (
            rating !==
            undefined
          ) {
            query.rating =
              rating;
          }

          const sortCriteria =
            this.getSortCriteria(
              safeSortBy,
              sortOrder,
            );

          try {
            const [
              data,
              total,
            ] =
              await Promise.all([
                Review.find(
                  query,
                )
                  .populate(
                    "reviewerId",
                    "fullName profileImage userReference",
                  )
                  .populate(
                    "bookingId",
                    "bookingReference completedAt",
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

                Review.countDocuments(
                  query,
                ),
              ]);

            return {
              coordinator: {
                _id:
                  coordinator._id,

                fullName:
                  coordinator.fullName,

                profileImage:
                  coordinator.profileImage,

                userReference:
                  coordinator.userReference,

                averageRating:
                  coordinator
                    .coordinatorProfile
                    .averageRating,

                totalRatings:
                  coordinator
                    .coordinatorProfile
                    .totalRatings,
              },

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
              error instanceof
                Error
                ? error.message
                : "Unknown error";

            throw new Error(
              `Coordinator reviews fetch failed: ${message}`,
            );
          }
        },
    });
  }

  static async exportReviewsToCsv(
    reviewIds: string[],
  ) {
    if (
      !Array.isArray(
        reviewIds,
      ) ||
      reviewIds.length ===
      0
    ) {
      throw new Error(
        "At least one review ID is required",
      );
    }

    if (
      reviewIds.length >
      1000
    ) {
      throw new Error(
        "A maximum of 1000 reviews can be exported at once",
      );
    }

    const uniqueReviewIds = [
      ...new Set(
        reviewIds,
      ),
    ];

    for (
      const reviewId of
      uniqueReviewIds
    ) {
      if (
        !Types.ObjectId.isValid(
          reviewId,
        )
      ) {
        throw new Error(
          "Invalid review ID",
        );
      }
    }

    const reviewObjectIds =
      uniqueReviewIds.map(
        (
          reviewId,
        ) =>
          new Types.ObjectId(
            reviewId,
          ),
      );

    const reviews =
      await Review.find({
        _id: {
          $in:
            reviewObjectIds,
        },
      })
        .select(
          [
            "bookingId",
            "reviewerId",
            "revieweeId",
            "direction",
            "rating",
            "review",
            "imageUrl",
            "editedAt",
            "editCount",
            "visibility",
            "moderationStatus",
            "moderationReason",
            "moderatedBy",
            "moderatedAt",
            "isDeleted",
            "deletedBy",
            "deletedAt",
            "deletionReason",
            "createdAt",
            "updatedAt",
          ].join(
            " ",
          ),
        )

        .populate({
          path:
            "reviewerId",

          select:
            "fullName email phone role userReference",
        })

        .populate({
          path:
            "revieweeId",

          select:
            "fullName email phone role userReference",
        })

        .populate({
          path:
            "bookingId",

          select:
            "bookingReference",
        })

        .populate({
          path:
            "moderatedBy",

          select:
            "fullName email role userReference",
        })

        .populate({
          path:
            "deletedBy",

          select:
            "fullName email role userReference",
        })

        .lean();

    if (
      reviews.length ===
      0
    ) {
      throw new Error(
        "Reviews not found for export",
      );
    }

    /*
     * Preserve frontend selection order.
     */
    const reviewMap =
      new Map(
        reviews.map(
          (
            review,
          ) => [
              review._id
                .toString(),

              review,
            ],
        ),
      );

    const orderedReviews =
      uniqueReviewIds
        .map(
          (
            reviewId,
          ) =>
            reviewMap.get(
              reviewId,
            ),
        )
        .filter(
          (
            review,
          ): review is NonNullable<
            typeof review
          > =>
            Boolean(
              review,
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
       * Prevent spreadsheet formula
       * injection when opened in Excel
       * or similar software.
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

    const getPopulatedId = (
      value: unknown,
    ): string => {
      if (
        !value ||
        typeof value !==
        "object"
      ) {
        return "";
      }

      const record =
        value as {
          _id?: unknown;
        };

      return record._id
        ? String(
          record._id,
        )
        : "";
    };

    const getPopulatedString = (
      value: unknown,
      field: string,
    ): string => {
      if (
        !value ||
        typeof value !==
        "object"
      ) {
        return "";
      }

      const record =
        value as Record<
          string,
          unknown
        >;

      const fieldValue =
        record[field];

      return typeof fieldValue ===
        "string"
        ? fieldValue
        : "";
    };

    const headers = [
      "Review ID",

      "Booking ID",
      "Booking Reference",

      "Reviewer ID",
      "Reviewer Name",
      "Reviewer Email",
      "Reviewer Role",

      "Reviewee ID",
      "Reviewee Name",
      "Reviewee Email",
      "Reviewee Role",

      "Direction",

      "Rating",
      "Review",
      "Image URL",

      "Edit Count",
      "Edited At",

      "Visibility",

      "Moderation Status",
      "Moderation Reason",
      "Moderated By",
      "Moderated At",

      "Deleted",
      "Deleted By",
      "Deleted At",
      "Deletion Reason",

      "Created At",
      "Updated At",
    ];

    const rows =
      orderedReviews.map(
        (
          review,
        ) => {
          const reviewer =
            review.reviewerId;

          const reviewee =
            review.revieweeId;

          const booking =
            review.bookingId;

          const moderatedBy =
            review.moderatedBy;

          const deletedBy =
            review.deletedBy;

          return [
            review._id
              .toString(),

            getPopulatedId(
              booking,
            ),

            getPopulatedString(
              booking,
              "bookingReference",
            ),

            getPopulatedId(
              reviewer,
            ),

            getPopulatedString(
              reviewer,
              "fullName",
            ),

            getPopulatedString(
              reviewer,
              "email",
            ),

            getPopulatedString(
              reviewer,
              "role",
            ),

            getPopulatedString(
              reviewee,
              "_id",
            ) ||
            (
              review.revieweeId
                ? String(
                  review.revieweeId,
                )
                : ""
            ),

            getPopulatedString(
              reviewee,
              "fullName",
            ),

            getPopulatedString(
              reviewee,
              "email",
            ),

            getPopulatedString(
              reviewee,
              "role",
            ),

            review.direction,

            review.rating,

            review.review ??
            "",

            review.imageUrl ??
            "",

            review.editCount,

            formatDate(
              review.editedAt,
            ),

            review.visibility,

            review.moderationStatus,

            review.moderationReason ??
            "",

            getPopulatedString(
              moderatedBy,
              "fullName",
            ),

            formatDate(
              review.moderatedAt,
            ),

            review.isDeleted,

            getPopulatedString(
              deletedBy,
              "fullName",
            ),

            formatDate(
              review.deletedAt,
            ),

            review.deletionReason ??
            "",

            formatDate(
              review.createdAt,
            ),

            formatDate(
              review.updatedAt,
            ),
          ];
        },
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
        orderedReviews.length,
    };
  }
}