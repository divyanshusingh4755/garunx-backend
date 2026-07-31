import { Types } from "mongoose";
import { type ReviewDirection, type ReviewModerationStatus, type ReviewVisibility } from "../models/review.model.js";
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
export type ReviewModerationAction = "HIDE" | "UNPUBLISH" | "PUBLISH" | "FLAG" | "UNFLAG" | "DELETE";
interface ModerateReviewInput {
    reviewId: string;
    adminId: string;
    action: ReviewModerationAction;
    reason?: string | null;
}
export declare class ReviewService {
    private static safePagination;
    private static getSortCriteria;
    private static adjustRatingAggregate;
    private static resolveReviewParticipants;
    static getAllReviews(params: {
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
    }): Promise<{
        data: (import("../models/review.model.js").IReview & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static createReviewService(input: CreateReviewInput): Promise<never>;
    static editReviewService(input: EditReviewInput): Promise<never>;
    static moderateReviewService(input: ModerateReviewInput): Promise<never>;
    static getMyBookingReview(input: {
        bookingId: string;
        userId: string;
    }): Promise<{
        booking: {
            _id: Types.ObjectId;
            bookingReference: string;
            status: import("../models/booking.model.js").BookingStatus;
            completedAt: Date | undefined;
        };
        role: string;
        canReview: boolean;
        hasReviewed: boolean;
        review: (import("../models/review.model.js").IReview & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
    }>;
    static getMyReviews(params: {
        userId: string;
        rating?: number;
        direction?: ReviewDirection;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/review.model.js").IReview & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static getCoordinatorReviews(params: {
        coordinatorId: string;
        rating?: number;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        coordinator: {
            _id: Types.ObjectId;
            fullName: string | undefined;
            profileImage: string | null | undefined;
            userReference: string;
            averageRating: number;
            totalRatings: number;
        };
        data: (import("../models/review.model.js").IReview & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
export {};
//# sourceMappingURL=review.services.d.ts.map