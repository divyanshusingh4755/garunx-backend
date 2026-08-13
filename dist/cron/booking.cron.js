import cron from "node-cron";
import { BookingService } from "../services/booking.service.js";
export const startBookingCronJobs = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const paymentResult = await BookingService
                .expirePendingPayments();
            console.log("[CRON] Payment expiry:", paymentResult);
            const timeoutResult = await BookingService
                .processAssignmentTimeouts();
            console.log("[CRON] Assignment timeout:", timeoutResult);
            const autoAssignmentResult = await BookingService
                .processAutoAssignments();
            console.log("[CRON] Auto assignment:", autoAssignmentResult);
        }
        catch (error) {
            console.error("[CRON] Booking cron failed:", error);
        }
    }, {
        name: "booking-processing",
        timezone: "UTC",
        noOverlap: true,
    });
};
//# sourceMappingURL=booking.cron.js.map