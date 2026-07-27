import type { Request, Response } from "express";
import { ReviewService } from "../services/review.services.js";
import type { ReviewDirection } from "../models/review.model.js";

export const getAllReviews = async (
    req: Request,
    res: Response,
) => {
    try {
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
            limit,
            page,
            sortBy,
            sortOrder,
        } = req.query;

        const result =
            await ReviewService.getAllReviews({
                searchTerm:
                    searchTerm as string,

                direction:
                    direction as
                    | "CUSTOMER_TO_COORDINATOR"
                    | "COORDINATOR_TO_CUSTOMER",

                visibility:
                    visibility as
                    | "PUBLISHED"
                    | "HIDDEN"
                    | "UNPUBLISHED",

                moderationStatus:
                    moderationStatus as
                    | "CLEAN"
                    | "FLAGGED",

                ...(isDeleted !== undefined && {
                    isDeleted:
                        isDeleted === "true",
                }),

                ...(rating !== undefined && {
                    rating: Number(rating),
                }),

                reviewerId:
                    reviewerId as string,

                revieweeId:
                    revieweeId as string,

                bookingId:
                    bookingId as string,

                limit:
                    Number(limit) || 40,

                page:
                    Number(page) || 1,

                sortBy:
                    (sortBy as string) ||
                    "createdAt",

                sortOrder:
                    (sortOrder as
                        | "asc"
                        | "desc") ||
                    "desc",
            });

        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const createReview = async (
    req: Request,
    res: Response,
) => {
    try {
        const { bookingId } = req.params;
        const { rating, review } = req.body;

        const reviewerId = req.user?.userId;

        if (!reviewerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (
            !bookingId ||
            Array.isArray(bookingId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required",
            });
        }

        const createdReview =
            await ReviewService.createReviewService({
                bookingId,
                reviewerId: reviewerId.toString(),
                rating,
                review,
            });

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review: createdReview,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to submit review",
        });
    }
};

export const editReview = async (
    req: Request,
    res: Response,
) => {
    try {
        const { reviewId } = req.params;
        const { rating, review } = req.body;

        const reviewerId = req.user?.userId;

        if (!reviewerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (
            !reviewId ||
            Array.isArray(reviewId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid review ID is required",
            });
        }

        const updatedReview =
            await ReviewService.editReviewService({
                reviewId,
                reviewerId:
                    reviewerId.toString(),
                rating,
                review,
            });

        return res.status(200).json({
            success: true,
            message:
                "Review updated successfully",
            review: updatedReview,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to update review",
        });
    }
};

export const moderateReview = async (
    req: Request,
    res: Response,
) => {
    try {
        const { reviewId } = req.params;
        const { action, reason } = req.body;

        const adminId = req.user?.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (
            !reviewId ||
            Array.isArray(reviewId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid review ID is required",
            });
        }

        const moderatedReview =
            await ReviewService.moderateReviewService({
                reviewId,
                adminId: adminId.toString(),
                action,
                reason,
            });

        return res.status(200).json({
            success: true,
            message:
                "Review moderated successfully",
            review: moderatedReview,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to moderate review",
        });
    }
};

export const getMyBookingReview = async (
    req: Request,
    res: Response,
) => {
    try {
        const { bookingId } =
            req.params;

        const userId =
            req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (
            !bookingId ||
            Array.isArray(bookingId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid booking ID is required",
            });
        }

        const result =
            await ReviewService
                .getMyBookingReview({
                    bookingId,
                    userId:
                        userId.toString(),
                });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch review",
        });
    }
};

export const getMyReviews = async (
    req: Request,
    res: Response,
) => {
    try {
        const userId =
            req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            rating,
            direction,
            limit,
            page,
            sortBy,
            sortOrder,
        } = req.query;

        const result =
            await ReviewService.getMyReviews({
                userId:
                    userId.toString(),

                ...(rating !== undefined && {
                    rating: Number(rating),
                }),

                ...(direction && {
                    direction:
                        direction as ReviewDirection,
                }),

                limit:
                    Number(limit) || 20,

                page:
                    Number(page) || 1,

                sortBy:
                    (sortBy as string) ||
                    "createdAt",

                sortOrder:
                    (sortOrder as
                        | "asc"
                        | "desc") ||
                    "desc",
            });

        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages:
                result.totalPages,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch reviews",
        });
    }
};

export const getCoordinatorReviews = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            coordinatorId,
        } = req.params;

        if (
            !coordinatorId ||
            Array.isArray(
                coordinatorId,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid coordinator ID is required",
            });
        }

        const {
            rating,
            limit,
            page,
            sortBy,
            sortOrder,
        } = req.query;

        const result =
            await ReviewService
                .getCoordinatorReviews({
                    coordinatorId,

                    ...(rating !== undefined && {
                        rating:
                            Number(rating),
                    }),

                    limit:
                        Number(limit) ||
                        20,

                    page:
                        Number(page) ||
                        1,

                    sortBy:
                        (sortBy as string) ||
                        "createdAt",

                    sortOrder:
                        (sortOrder as
                            | "asc"
                            | "desc") ||
                        "desc",
                });

        return res.status(200).json({
            success: true,

            coordinator:
                result.coordinator,

            data:
                result.data,

            total:
                result.total,

            currentPage:
                result.page,

            totalPages:
                result.totalPages,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message:
                error?.message ||
                "Failed to fetch coordinator reviews",
        });
    }
};