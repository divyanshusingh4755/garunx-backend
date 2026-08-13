import { Types, type Document, type Model } from "mongoose";
export declare const NOTIFICATION_PREFERENCE_CATEGORIES: readonly ["BOOKING", "PAYMENT", "QUERY", "REVIEW", "PROMOTIONAL", "APP_UPDATE", "NEW_FEATURE"];
export type NotificationPreferenceCategory = (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[number];
export interface INotificationPreference extends Document {
    userId: Types.ObjectId;
    categories: {
        booking: boolean;
        payment: boolean;
        query: boolean;
        review: boolean;
        promotional: boolean;
        appUpdate: boolean;
        newFeature: boolean;
    };
    channels: {
        inApp: boolean;
        email: boolean;
        push: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const NotificationPreference: Model<INotificationPreference>;
//# sourceMappingURL=notification-preference.model.d.ts.map