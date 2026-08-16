import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
interface AuthNotificationTemplateSeed {
    code: string;
    type: NotificationType;
    category: NotificationCategory;
    preferenceMode: NotificationPreferenceMode;
    title: string;
    message: string;
    emailSubject: string;
    emailBody: string;
    pushTitle: string;
    pushMessage: string;
    isActive: boolean;
}
export declare const AUTH_NOTIFICATION_TEMPLATES: AuthNotificationTemplateSeed[];
export {};
//# sourceMappingURL=auth-notification-templates.d.ts.map