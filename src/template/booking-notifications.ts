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

export const BOOKING_NOTIFICATION_TEMPLATES:
    BookingNotificationTemplateSeed[] = [
        {
            code: "BOOKING_CONFIRMED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Booking confirmed",
            message:
                "Your booking {{bookingReference}} is confirmed for {{scheduledAt}}.",
            emailSubject:
                "Booking {{bookingReference}} confirmed",
            emailBody:
                "Your booking {{bookingReference}} has been confirmed. Scheduled time: {{scheduledAt}}.",
            pushTitle:
                "Booking confirmed",
            pushMessage:
                "Booking {{bookingReference}} is confirmed.",
            isActive: true,
        },

        {
            code: "BOOKING_ASSIGNMENT_REQUESTED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "New booking request",
            message:
                "You have received booking request {{bookingReference}} for {{scheduledAt}}. Please respond before {{responseDeadlineAt}}.",
            emailSubject:
                "New booking assignment request",
            emailBody:
                "You have received booking request {{bookingReference}} scheduled for {{scheduledAt}}. Please accept or reject the request before {{responseDeadlineAt}}.",
            pushTitle:
                "New booking request",
            pushMessage:
                "Booking {{bookingReference}} is waiting for your response.",
            isActive: true,
        },

        {
            code: "BOOKING_ASSIGNED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Coordinator assigned",
            message:
                "A coordinator has accepted booking {{bookingReference}} scheduled for {{scheduledAt}}.",
            emailSubject:
                "Coordinator assigned to {{bookingReference}}",
            emailBody:
                "A coordinator has accepted your booking {{bookingReference}}. Scheduled time: {{scheduledAt}}.",
            pushTitle:
                "Coordinator assigned",
            pushMessage:
                "A coordinator accepted booking {{bookingReference}}.",
            isActive: true,
        },

        {
            code: "BOOKING_RESCHEDULED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Booking rescheduled",
            message:
                "Booking {{bookingReference}} has been rescheduled to {{scheduledAt}}. Reason: {{reason}}.",
            emailSubject:
                "Booking {{bookingReference}} rescheduled",
            emailBody:
                "Your booking {{bookingReference}} has been rescheduled to {{scheduledAt}}. Reason: {{reason}}.",
            pushTitle:
                "Booking rescheduled",
            pushMessage:
                "{{bookingReference}} is now scheduled for {{scheduledAt}}.",
            isActive: true,
        },

        {
            code: "COORDINATOR_BOOKING_RESCHEDULED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Assigned booking rescheduled",
            message:
                "Booking {{bookingReference}} assigned to you has been rescheduled to {{scheduledAt}}. Reason: {{reason}}.",
            emailSubject:
                "Assigned booking {{bookingReference}} rescheduled",
            emailBody:
                "Booking {{bookingReference}} assigned to you has been rescheduled to {{scheduledAt}}. Reason: {{reason}}.",
            pushTitle:
                "Booking rescheduled",
            pushMessage:
                "{{bookingReference}} is now scheduled for {{scheduledAt}}.",
            isActive: true,
        },

        {
            code: "BOOKING_CANCELLED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Booking cancelled",
            message:
                "Booking {{bookingReference}} has been cancelled. Reason: {{reason}}.",
            emailSubject:
                "Booking {{bookingReference}} cancelled",
            emailBody:
                "Your booking {{bookingReference}} has been cancelled. Reason: {{reason}}.",
            pushTitle:
                "Booking cancelled",
            pushMessage:
                "Booking {{bookingReference}} has been cancelled.",
            isActive: true,
        },

        {
            code: "COORDINATOR_BOOKING_CANCELLED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Assigned booking cancelled",
            message:
                "Booking {{bookingReference}} assigned to you has been cancelled. Reason: {{reason}}.",
            emailSubject:
                "Assigned booking {{bookingReference}} cancelled",
            emailBody:
                "Booking {{bookingReference}} assigned to you has been cancelled. Reason: {{reason}}.",
            pushTitle:
                "Booking cancelled",
            pushMessage:
                "Assigned booking {{bookingReference}} has been cancelled.",
            isActive: true,
        },

        {
            code: "BOOKING_STARTED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Booking started",
            message:
                "Service for booking {{bookingReference}} has started.",
            pushTitle:
                "Service started",
            pushMessage:
                "Your booking {{bookingReference}} is now in progress.",
            isActive: true,
        },

        {
            code: "BOOKING_COMPLETED",
            type: "BOOKING",
            category: "BOOKING",
            preferenceMode: "REQUIRED",
            title: "Booking completed",
            message:
                "Booking {{bookingReference}} has been completed successfully.",
            emailSubject:
                "Booking {{bookingReference}} completed",
            emailBody:
                "Your booking {{bookingReference}} has been completed successfully.",
            pushTitle:
                "Booking completed",
            pushMessage:
                "Booking {{bookingReference}} has been completed.",
            isActive: true,
        },

        {
            code: "PAYMENT_FAILED",
            type: "PAYMENT",
            category: "PAYMENT",
            preferenceMode: "REQUIRED",
            title: "Payment unsuccessful",
            message:
                "Payment for booking {{bookingReference}} was unsuccessful. {{reason}}.",
            emailSubject:
                "Payment unsuccessful for {{bookingReference}}",
            emailBody:
                "Payment for booking {{bookingReference}} was unsuccessful. {{reason}}. Please retry payment if the booking is still available.",
            pushTitle:
                "Payment unsuccessful",
            pushMessage:
                "Payment for {{bookingReference}} was unsuccessful.",
            isActive: true,
        },

        {
            code: "PAYMENT_REFUNDED",
            type: "PAYMENT",
            category: "PAYMENT",
            preferenceMode: "REQUIRED",
            title: "Refund processed",
            message:
                "A refund of ₹{{refundedAmount}} was processed for booking {{bookingReference}}. Status: {{paymentStatus}}.",
            emailSubject:
                "Refund processed for {{bookingReference}}",
            emailBody:
                "A refund of ₹{{refundedAmount}} was processed for booking {{bookingReference}}. Payment status: {{paymentStatus}}. Reason: {{reason}}.",
            pushTitle:
                "Refund processed",
            pushMessage:
                "₹{{refundedAmount}} refunded for {{bookingReference}}.",
            isActive: true,
        },
    ];