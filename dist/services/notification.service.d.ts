import { Types } from "mongoose";
import { type NotificationType } from "../models/notification.model.js";
import { Role } from "../types/rbac.js";
export interface NotificationChannels {
    email?: boolean;
    push?: boolean;
}
export declare class NotificationService {
    private static isCategoryEnabled;
    private static emitUnreadCount;
    static createNotification(params: {
        recipientId: string | Types.ObjectId;
        recipientRole: Role;
        title: string;
        message: string;
        type: NotificationType;
        referenceId?: string | Types.ObjectId;
        dedupeKey?: string;
        emailRequested?: boolean;
        pushRequested?: boolean;
        templateCode?: string;
        emailSubject?: string;
        emailBody?: string;
        pushTitle?: string;
        pushMessage?: string;
        showInApp?: boolean;
    }): Promise<{
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
    }>;
    static getMyNotifications(params: {
        userId: string;
        page?: number;
        limit?: number;
        isRead?: boolean;
        type?: NotificationType;
    }): Promise<{
        notifications: (import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        unreadCount: number;
    }>;
    static getUnreadCount(userId: string): Promise<{
        unreadCount: number;
    }>;
    static markAsRead(params: {
        notificationId: string;
        userId: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static markAllAsRead(userId: string): Promise<{
        modifiedCount: number;
    }>;
    static deleteNotification(params: {
        notificationId: string;
        userId: string;
    }): Promise<{
        message: string;
    }>;
    static sendAdminNotification(params: {
        title: string;
        message: string;
        type: NotificationType;
        audience: "ALL" | Role;
        referenceId?: string;
    }): Promise<{
        totalRecipients: number;
    }>;
    static createFromTemplate(params: {
        recipientId: string | Types.ObjectId;
        recipientRole: Role;
        templateCode: string;
        variables?: Record<string, string | number | boolean | Date | null | undefined>;
        referenceId?: string | Types.ObjectId;
        dedupeKey?: string;
        channels?: NotificationChannels;
    }): Promise<{
        notification: null;
        created: boolean;
        skipped: boolean;
        skipReason: string;
        delivery: {
            inApp: boolean;
            email: boolean;
            push: boolean;
        };
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        skipped: boolean;
        delivery: {
            inApp: boolean;
            email: boolean;
            push: boolean;
        };
        skipReason?: never;
    } | {
        notification: import("mongoose").Document<unknown, {}, import("../models/notification.model.js").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification.model.js").INotification & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        created: boolean;
        delivery: {
            inApp: boolean;
            email: boolean;
            push: boolean;
        };
        skipped?: never;
        skipReason?: never;
    }>;
    static retryEmail(notificationId: string): Promise<{
        emailSent: boolean;
        messageId: string;
    }>;
    static retryPush(notificationId: string): Promise<{
        status: "FAILED" | "SENT" | "PARTIAL";
        attempted: number;
        successCount: number;
        failureCount: number;
        deactivatedCount: number;
    }>;
}
//# sourceMappingURL=notification.service.d.ts.map