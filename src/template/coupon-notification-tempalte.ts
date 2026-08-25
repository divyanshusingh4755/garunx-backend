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

export const COUPON_NOTIFICATION_TEMPLATES:
    CouponNotificationTemplateSeed[] = [
        {
            code: "REFERRAL_COUPON_ASSIGNED",

            // NotificationType currently does not contain PROMOTIONAL. Keep the transport type as SYSTEM for now, while the category remains PROMOTIONAL so user promotional preferences are respected. If PROMOTIONAL is later added to NOTIFICATION_TYPES, change this type to "PROMOTIONAL".
            type: "SYSTEM",
            category: "PROMOTIONAL",
            preferenceMode: "OPTIONAL",
            title: "New coupon for you",
            message: "{{couponName}} has been added to your account. Use code {{couponCode}} to get {{discountText}} off. Validity: {{validityText}}.",
            emailSubject: "You received a new coupon: {{couponCode}}",
            emailBody: "A new coupon has been assigned to your account. Coupon: {{couponName}}. Code: {{couponCode}}. Discount: {{discountText}}. Validity: {{validityText}}.",
            pushTitle: "New coupon for you",
            pushMessage: "Use {{couponCode}} to get {{discountText}} off.",
            isActive: true,
        },
    ];