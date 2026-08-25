import { Booking } from "../models/booking.model.js";
import { NotificationService } from "./notification.service.js";
import { Role } from "../types/rbac.js";
export class NotificationReminderService {
    static async processUpcomingBookingReminders() {
        const now = new Date();
        const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const bookings = await Booking.find({
            isDeleted: false,
            status: { $in: ["CONFIRMED", "ASSIGNED",] },
            scheduledAt: { $gte: windowStart, $lte: windowEnd },
            userId: { $exists: true, $ne: null },
        }).select("_id userId bookingReference scheduledAt");
        let processed = 0;
        for (const booking of bookings) {
            if (!booking.userId || !booking.scheduledAt) {
                continue;
            }
            const result = await NotificationService.createFromTemplate({
                recipientId: booking.userId,
                recipientRole: Role.USER,
                templateCode: "BOOKING_24_HOUR_REMINDER",
                variables: {
                    bookingReference: booking.bookingReference,
                    scheduledAt: booking.scheduledAt,
                },
                referenceId: booking._id,
                dedupeKey: `BOOKING:${booking._id}:24_HOUR_REMINDER:${booking.scheduledAt.getTime()}`,
                channels: { email: true, push: true },
            });
            if (result.created) {
                processed++;
            }
        }
        return { processed };
    }
    static async processPaymentExpiryReminders() {
        const now = new Date();
        const windowStart = new Date(now.getTime() + 20 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
        const bookings = await Booking.find({
            isDeleted: false,
            status: "PENDING_PAYMENT",
            "payment.status": "PENDING",
            paymentExpiresAt: {
                $gte: windowStart,
                $lte: windowEnd,
            },
            userId: { $exists: true, $ne: null },
        }).select("_id userId bookingReference paymentExpiresAt");
        let processed = 0;
        for (const booking of bookings) {
            if (!booking.userId || !booking.paymentExpiresAt) {
                continue;
            }
            const result = await NotificationService.createFromTemplate({
                recipientId: booking.userId,
                recipientRole: Role.USER,
                templateCode: "PAYMENT_EXPIRY_REMINDER",
                variables: {
                    bookingReference: booking.bookingReference,
                    paymentExpiresAt: booking.paymentExpiresAt,
                },
                referenceId: booking._id,
                dedupeKey: `BOOKING:${booking._id}:PAYMENT_EXPIRY_30_MIN:${booking.paymentExpiresAt.getTime()}`,
                channels: { email: true, push: true },
            });
            if (result.created) {
                processed++;
            }
        }
        return { processed };
    }
}
//# sourceMappingURL=notification-reminder.service.js.map