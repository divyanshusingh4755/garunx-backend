import { Schema, Types, model, Document, Model, } from "mongoose";
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
    },
    // Editing
    editedAt: {
        type: Date,
    },
    editCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Visibility
    visibility: {
        type: String,
        enum: [
            "PUBLISHED",
            "HIDDEN",
            "UNPUBLISHED",
        ],
        default: "PUBLISHED",
        index: true,
    },
    // Moderation
    moderationStatus: {
        type: String,
        enum: [
            "CLEAN",
            "FLAGGED",
        ],
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
    // Soft Delete
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
// One reviewer can review only once per booking
reviewSchema.index({
    bookingId: 1,
    reviewerId: 1,
}, {
    unique: true,
});
// Reviews received by user/coordinator
reviewSchema.index({
    revieweeId: 1,
    createdAt: -1,
});
// Reviews given by user/coordinator
reviewSchema.index({
    reviewerId: 1,
    createdAt: -1,
});
// Booking-level review lookup
reviewSchema.index({
    bookingId: 1,
    direction: 1,
});
// Public/visible review listing
reviewSchema.index({
    revieweeId: 1,
    visibility: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Admin moderation listing
reviewSchema.index({
    moderationStatus: 1,
    visibility: 1,
    isDeleted: 1,
    createdAt: -1,
});
export const Review = model("Review", reviewSchema);
//# sourceMappingURL=review.model.js.map