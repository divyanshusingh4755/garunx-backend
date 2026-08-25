import { Schema, Types, model, type Document, type Model } from "mongoose";

export type ReviewDirection = "CUSTOMER_TO_COORDINATOR" | "COORDINATOR_TO_CUSTOMER";
export type ReviewVisibility = "PUBLISHED" | "HIDDEN" | "UNPUBLISHED";
export type ReviewModerationStatus = "CLEAN" | "FLAGGED";

export interface IReview extends Document {
  bookingId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  direction: ReviewDirection;
  rating: number;
  review: string | null;
  imageUrl: string | null;
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

const reviewSchema = new Schema<IReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    direction: {
      type: String,
      enum: ["CUSTOMER_TO_COORDINATOR", "COORDINATOR_TO_CUSTOMER"] satisfies ReviewDirection[],
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    editedAt: {
      type: Date,
    },

    editCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    visibility: {
      type: String,
      enum: ["PUBLISHED", "HIDDEN", "UNPUBLISHED"] satisfies ReviewVisibility[],
      default: "PUBLISHED",
      index: true,
    },

    moderationStatus: {
      type: String,
      enum: ["CLEAN", "FLAGGED"] satisfies ReviewModerationStatus[],
      default: "CLEAN",
      index: true,
    },

    moderationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    moderatedAt: {
      type: Date,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    deletedAt: {
      type: Date,
    },

    deletionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.pre("validate", function () {
  if (this.reviewerId.equals(this.revieweeId)) { throw new Error("Reviewer and reviewee cannot be the same"); }
  if (this.isDeleted && !this.deletedAt) { this.deletedAt = new Date(); }
});

reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true, name: "UniqueReviewerPerBooking" });
reviewSchema.index({ revieweeId: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1, direction: 1 });
reviewSchema.index({ revieweeId: 1, visibility: 1, isDeleted: 1, createdAt: -1 });
reviewSchema.index({ moderationStatus: 1, visibility: 1, isDeleted: 1, createdAt: -1 });

export const Review: Model<IReview> = model<IReview>("Review", reviewSchema);
