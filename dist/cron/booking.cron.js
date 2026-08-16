import cron from "node-cron";
import { BookingService } from "../services/booking.service.js";
export const startBookingCronJobs = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const result = await BookingService.expirePendingPayments();
            console.log("[CRON] Payment expiry:", result);
        }
        catch (error) {
            console.error("[CRON] Payment expiry failed:", error);
        }
        try {
            const result = await BookingService.processAssignmentTimeouts();
            console.log("[CRON] Assignment timeout:", result);
        }
        catch (error) {
            console.error("[CRON] Assignment timeout failed:", error);
        }
        try {
            const result = await BookingService.processAutoAssignments();
            console.log("[CRON] Auto assignment:", result);
        }
        catch (error) {
            console.error("[CRON] Auto assignment failed:", error);
        }
    }, {
        name: "booking-processing",
        timezone: "UTC",
        noOverlap: true,
    });
};
//# sourceMappingURL=booking.cron.js.map