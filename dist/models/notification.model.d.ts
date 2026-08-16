import { Types, Document, Model } from "mongoose";
import { Role } from "../types/rbac.js";
export declare const PUSH_DELIVERY_STATUSES: readonly ["NOT_REQUESTED", "PENDING", "RETRYING", "SENT", "PARTIAL", "FAILED"];
export type PushDeliveryStatus = (typeof PUSH_DELIVERY_STATUSES)[number];
export declare const EMAIL_DELIVERY_STATUSES: readonly ["NOT_REQUESTED", "PENDING", "RETRYING", "SENT", "FAILED"];
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];
export declare const NOTIFICATION_TYPES: readonly ["BOOKING", "PAYMENT", "QUERY", "REVIEW", "SYSTEM"];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export interface INotification extends Document {
    recipientId: Types.ObjectId;
    recipientRole: Role;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: Types.ObjectId;
    showInApp: boolean;
    templateCode?: string;
    dedupeKey?: string;
    emailDelivery: {
        status: EmailDeliveryStatus;
        subject?: string;
        body?: string;
        sentAt?: Date;
        failedAt?: Date;
        error?: string;
        messageId?: string;
    };
    pushDelivery: {
        status: PushDeliveryStatus;
        title?: string;
        message?: string;
        attemptedCount?: number;
        successCount?: number;
        failureCount?: number;
        sentAt?: Date;
        failedAt?: Date;
        error?: string;
    };
    isRead: boolean;
    readAt?: Date;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notification: Model<INotification>;
//# sourceMappingURL=notification.model.d.ts.map