import { model, Schema, Types, Document, Model } from "mongoose";
import { Role } from "../types/rbac.js";
export const PUSH_DELIVERY_STATUSES = ["NOT_REQUESTED", "PENDING", "RETRYING", "SENT", "PARTIAL", "FAILED"];
export const EMAIL_DELIVERY_STATUSES = ["NOT_REQUESTED", "PENDING", "RETRYING", "SENT", "FAILED"];
export const NOTIFICATION_TYPES = ["BOOKING", "PAYMENT", "QUERY", "REVIEW", "SYSTEM"];
const notificationSchema = new Schema({
    recipientId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    recipientRole: {
        type: String,
        enum: Object.values(Role),
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
        index: true,
    },
    referenceId: {
        type: Schema.Types.ObjectId,
    },
    showInApp: {
        type: Boolean,
        default: true,
        index: true,
    },
    templateCode: {
        type: String,
        trim: true,
        uppercase: true,
        index: true,
    },
    dedupeKey: {
        type: String,
        trim: true,
    },
    emailDelivery: {
        status: {
            type: String,
            enum: EMAIL_DELIVERY_STATUSES,
            default: "NOT_REQUESTED",
        },
        subject: String,
        body: String,
        sentAt: Date,
        failedAt: Date,
        error: {
            type: String,
            maxlength: 1000,
        },
        messageId: String,
    },
    pushDelivery: {
        status: {
            type: String,
            enum: PUSH_DELIVERY_STATUSES,
            default: "NOT_REQUESTED",
        },
        title: {
            type: String,
            maxlength: 200,
        },
        message: {
            type: String,
            maxlength: 2000,
        },
        attemptedCount: {
            type: Number,
            default: 0,
        },
        successCount: {
            type: Number,
            default: 0,
        },
        failureCount: {
            type: Number,
            default: 0,
        },
        sentAt: {
            type: Date,
        },
        failedAt: {
            type: Date,
        },
        error: {
            type: String,
            maxlength: 1000,
        },
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
});
notificationSchema.index({ recipientId: 1, isDeleted: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1, isDeleted: 1 });
notificationSchema.index({ type: 1, referenceId: 1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
export const Notification = model("Notification", notificationSchema);
//# sourceMappingURL=notification.model.js.map