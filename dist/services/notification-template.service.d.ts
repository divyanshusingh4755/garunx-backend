import { type NotificationCategory, type NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
export declare class NotificationTemplateService {
    private static renderText;
    private static getRequiredVariables;
    private static validateVariables;
    static renderTemplate(params: {
        templateCode: string;
        variables?: Record<string, string | number | boolean | Date | null | undefined>;
        includeEmail?: boolean;
        includePush?: boolean;
    }): Promise<{
        pushMessage?: string;
        pushTitle?: string;
        emailBody?: string;
        emailSubject?: string;
        templateId: import("mongoose").Types.ObjectId;
        code: string;
        type: "QUERY" | "SYSTEM" | "BOOKING" | "PAYMENT" | "REVIEW";
        category: "QUERY" | "SYSTEM" | "BOOKING" | "PAYMENT" | "REVIEW" | "PROMOTIONAL" | "APP_UPDATE" | "NEW_FEATURE";
        preferenceMode: "REQUIRED" | "OPTIONAL";
        title: string;
        message: string;
    }>;
    static createTemplate(params: {
        code: string;
        type: NotificationType;
        category: NotificationCategory;
        preferenceMode?: NotificationPreferenceMode;
        title: string;
        message: string;
        emailSubject?: string;
        emailBody?: string;
        pushTitle?: string;
        pushMessage?: string;
        isActive?: boolean;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-template.model.js").INotificationTemplate, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-template.model.js").INotificationTemplate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getTemplates(params: {
        page?: number;
        limit?: number;
        type?: NotificationType;
        isActive?: boolean;
        category?: NotificationCategory;
    }): Promise<{
        templates: (import("mongoose").Document<unknown, {}, import("../models/notification-template.model.js").INotificationTemplate, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-template.model.js").INotificationTemplate & Required<{
            _id: import("mongoose").Types.ObjectId;
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
    }>;
    static getTemplateById(templateId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-template.model.js").INotificationTemplate, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-template.model.js").INotificationTemplate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTemplate(params: {
        templateId: string;
        code?: string;
        type?: NotificationType;
        title?: string;
        message?: string;
        emailSubject?: string;
        emailBody?: string;
        pushTitle?: string;
        pushMessage?: string;
        isActive?: boolean;
        category?: NotificationCategory;
        preferenceMode?: NotificationPreferenceMode;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-template.model.js").INotificationTemplate, {}, import("mongoose").DefaultSchemaOptions> & import("../models/notification-template.model.js").INotificationTemplate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
//# sourceMappingURL=notification-template.service.d.ts.map