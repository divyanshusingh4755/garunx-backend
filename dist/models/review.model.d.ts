import { Types, Document, Model } from "mongoose";
export type ReviewDirection = "CUSTOMER_TO_COORDINATOR" | "COORDINATOR_TO_CUSTOMER";
export type ReviewVisibility = "PUBLISHED" | "HIDDEN" | "UNPUBLISHED";
export type ReviewModerationStatus = "CLEAN" | "FLAGGED";
export interface IReview extends Document {
    bookingId: Types.ObjectId;
    reviewerId: Types.ObjectId;
    revieweeId: Types.ObjectId;
    direction: ReviewDirection;
    rating: number;
    review?: string;
    editedAt?: Date;
    editCount: number;
    visibility: ReviewVisibility;
    moderationStatus: ReviewModerationStatus;
    moderationReason?: string;
    moderatedBy?: Types.ObjectId;
    moderatedAt?: Date;
    isDeleted: boolean;
    deletedBy?: Types.ObjectId;
    deletedAt?: Date;
    deletionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Review: Model<IReview>;
//# sourceMappingURL=review.model.d.ts.map