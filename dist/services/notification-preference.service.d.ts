import { Types } from "mongoose";
export declare class NotificationPreferenceService {
    static getOrCreatePreferences(userId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-preference.model.js").INotificationPreference, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-preference.model.js").INotificationPreference & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePreferences(params: {
        userId: string;
        categories?: {
            booking?: boolean;
            payment?: boolean;
            query?: boolean;
            review?: boolean;
            promotional?: boolean;
            appUpdate?: boolean;
            newFeature?: boolean;
        };
        channels?: {
            inApp?: boolean;
            email?: boolean;
            push?: boolean;
        };
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-preference.model.js").INotificationPreference, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-preference.model.js").INotificationPreference & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
//# sourceMappingURL=notification-preference.service.d.ts.map