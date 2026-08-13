import { type Document, type Model } from "mongoose";
import { type NotificationType } from "./notification.model.js";
export declare const NOTIFICATION_CATEGORIES: readonly ["BOOKING", "PAYMENT", "QUERY", "REVIEW", "PROMOTIONAL", "APP_UPDATE", "NEW_FEATURE", "SYSTEM"];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export declare const NOTIFICATION_PREFERENCE_MODES: readonly ["REQUIRED", "OPTIONAL"];
export type NotificationPreferenceMode = (typeof NOTIFICATION_PREFERENCE_MODES)[number];
export interface INotificationTemplate extends Document {
    code: string;
    type: NotificationType;
    category: NotificationCategory;
    preferenceMode: NotificationPreferenceMode;
    title: string;
    message: string;
    emailSubject?: string;
    emailBody?: string;
    pushTitle?: string;
    pushMessage?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const NotificationTemplate: Model<INotificationTemplate>;
//# sourceMappingURL=notification-template.model.d.ts.map