import { Schema, Types, model } from "mongoose";
const reviewSchema = new Schema({
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
        enum: [
            "CUSTOMER_TO_COORDINATOR",
            "COORDINATOR_TO_CUSTOMER",
        ],
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
        enum: ["PUBLISHED", "HIDDEN", "UNPUBLISHED"],
        default: "PUBLISHED",
        index: true,
    },
    moderationStatus: {
        type: String,
        enum: ["CLEAN", "FLAGGED"],
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
}, {
    timestamps: true,
});
reviewSchema.pre("validate", function () {
    if (this.reviewerId.equals(this.revieweeId)) {
        throw new Error("Reviewer and reviewee cannot be the same");
    }
    if (this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
});
reviewSchema.index({
    bookingId: 1,
    reviewerId: 1,
}, {
    unique: true,
    name: "UniqueReviewerPerBooking",
});
reviewSchema.index({
    revieweeId: 1,
    createdAt: -1,
});
reviewSchema.index({
    reviewerId: 1,
    createdAt: -1,
});
reviewSchema.index({
    bookingId: 1,
    direction: 1,
});
reviewSchema.index({
    revieweeId: 1,
    visibility: 1,
    isDeleted: 1,
    createdAt: -1,
});
reviewSchema.index({
    moderationStatus: 1,
    visibility: 1,
    isDeleted: 1,
    createdAt: -1,
});
export const Review = model("Review", reviewSchema);
//# sourceMappingURL=review.model.js.map