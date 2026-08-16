import type { NotificationCategory, NotificationPreferenceMode } from "../models/notification-template.model.js";
import type { NotificationType } from "../models/notification.model.js";
interface CouponNotificationTemplateSeed {
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
export declare const COUPON_NOTIFICATION_TEMPLATES: CouponNotificationTemplateSeed[];
export {};
//# sourceMappingURL=coupon-notification-tempalte.d.ts.map