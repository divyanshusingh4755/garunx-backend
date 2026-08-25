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

export const REVIEW_NOTIFICATION_TEMPLATES:
    ReviewNotificationTemplateSeed[] = [
        {
            code: "REVIEW_RECEIVED",
            type: "REVIEW",
            category: "REVIEW",
            preferenceMode: "OPTIONAL",
            title: "New review received",
            message: "You received a {{rating}}-star review for booking {{bookingReference}}.",
            pushTitle: "New review received",
            pushMessage: "You received a {{rating}}-star review for {{bookingReference}}.",
            isActive: true,
        },
        {
            code: "REVIEW_REMOVED_BY_ADMIN",
            type: "REVIEW",
            category: "REVIEW",
            preferenceMode: "REQUIRED",
            title: "Review removed",
            message: "Your review for booking {{bookingReference}} was removed by an administrator. Reason: {{reason}}.",
            emailSubject: "Your review was removed",
            emailBody: "Your review for booking {{bookingReference}} was removed by an administrator. Reason: {{reason}}.",
            pushTitle: "Review removed",
            pushMessage: "Your review for {{bookingReference}} was removed by an administrator.",
            isActive: true,
        },
    ];