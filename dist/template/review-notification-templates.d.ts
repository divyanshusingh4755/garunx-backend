import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
interface ReviewNotificationTemplateSeed {
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
}
export declare const REVIEW_NOTIFICATION_TEMPLATES: ReviewNotificationTemplateSeed[];
export {};
//# sourceMappingURL=review-notification-templates.d.ts.map