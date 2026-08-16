import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
interface BookingNotificationTemplateSeed {
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
export declare const BOOKING_NOTIFICATION_TEMPLATES: BookingNotificationTemplateSeed[];
export {};
//# sourceMappingURL=booking-notifications.d.ts.map