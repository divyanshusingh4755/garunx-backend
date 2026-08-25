import { Schema, Types, model } from "mongoose";
const userQuerySchema = new Schema({
    requesterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    requesterType: {
        type: String,
        enum: ["USER", "COORDINATOR"],
        required: true,
        index: true,
    },
    queryReference: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200,
    },
    category: {
        type: String,
        enum: ["BOOKING", "PAYMENT", "REFUND", "SERVICE", "PACKAGE", "ACCOUNT", "TECHNICAL", "OTHER"],
        required: true,
        index: true,
    },
    priority: {
        type: String,
        enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        default: "NORMAL",
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "ONGOING", "RESOLVED", "REJECTED"],
        default: "PENDING",
        required: true,
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
        enum: ["QUERY_CREATED", "REQUESTER_REPLIED", "ADMIN_REPLIED", "STATUS_CHANGED", "ASSIGNED", "PRIORITY_CHANGED", "CATEGORY_CHANGED", "QUERY_DELETED"],
        default: "QUERY_CREATED",
        required: true,
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
userQuerySchema.pre("validate", function () {
    if (this.status === "RESOLVED" && (!this.resolvedAt || !this.resolvedBy)) {
        throw new Error("Resolved query requires resolvedAt and resolvedBy");
    }
    if (this.status === "REJECTED" && (!this.rejectedAt || !this.rejectedBy || !this.rejectionReason?.trim())) {
        throw new Error("Rejected query requires rejection details");
    }
    if (this.isDeleted && (!this.deletedAt || !this.deletedBy || !this.deletionReason?.trim())) {
        throw new Error("Deleted query requires deletion details");
    }
});
userQuerySchema.index({ requesterId: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ requesterType: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ category: 1, status: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ priority: 1, status: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ assignedAdminId: 1, status: 1, isDeleted: 1, createdAt: -1 });
userQuerySchema.index({ isDeleted: 1, lastActionAt: -1 });
export const UserQuery = model("UserQuery", userQuerySchema);
//# sourceMappingURL=userQuery.model.js.map