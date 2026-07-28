import { Schema, Types, model, Document, Model, } from "mongoose";
const userQuerySchema = new Schema({
    requesterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    requesterType: {
        type: String,
        enum: [
            "USER",
            "COORDINATOR",
        ],
        required: true,
        index: true,
    },
    queryReference: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    category: {
        type: String,
        enum: [
            "BOOKING",
            "PAYMENT",
            "REFUND",
            "SERVICE",
            "PACKAGE",
            "ACCOUNT",
            "TECHNICAL",
            "OTHER",
        ],
        required: true,
        index: true,
    },
    priority: {
        type: String,
        enum: [
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT",
        ],
        default: "NORMAL",
        index: true,
    },
    status: {
        type: String,
        enum: [
            "PENDING",
            "ONGOING",
            "RESOLVED",
            "REJECTED",
        ],
        default: "PENDING",
        index: true,
    },
    assignedAdminId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    latestMessage: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    latestMessageAt: {
        type: Date,
        index: true,
    },
    lastAction: {
        type: String,
        enum: [
            "QUERY_CREATED",
            "REQUESTER_REPLIED",
            "ADMIN_REPLIED",
            "STATUS_CHANGED",
            "ASSIGNED",
            "PRIORITY_CHANGED",
            "CATEGORY_CHANGED",
        ],
        default: "QUERY_CREATED",
    },
    lastActionAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    lastActionBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requesterUnreadCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    adminUnreadCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    resolvedAt: {
        type: Date,
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    rejectedAt: {
        type: Date,
    },
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    deletionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
}, {
    timestamps: true,
});
// Requester's own queries
userQuerySchema.index({
    requesterId: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Customer / coordinator filtering
userQuerySchema.index({
    requesterType: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Admin status tabs
userQuerySchema.index({
    status: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Category filtering
userQuerySchema.index({
    category: 1,
    status: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Priority filtering
userQuerySchema.index({
    priority: 1,
    status: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Assigned admin listing
userQuerySchema.index({
    assignedAdminId: 1,
    status: 1,
    isDeleted: 1,
    createdAt: -1,
});
// Latest activity sorting
userQuerySchema.index({
    isDeleted: 1,
    lastActionAt: -1,
});
export const UserQuery = model("UserQuery", userQuerySchema);
//# sourceMappingURL=userQuery.model.js.map