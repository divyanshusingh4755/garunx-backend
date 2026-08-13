import cron from "node-cron";

import {
    NotificationReminderService,
} from "../services/notification-reminder.service.js";

export const startNotificationReminderJob =
    (): void => {
        cron.schedule(
            "*/10 * * * *",
            async () => {
                try {
                    const upcomingResult =
                        await NotificationReminderService
                            .processUpcomingBookingReminders();

                    const paymentResult =
                        await NotificationReminderService
                            .processPaymentExpiryReminders();

                    if (
                        upcomingResult.processed > 0 ||
                        paymentResult.processed > 0
                    ) {
                        console.log(
                            "[CRON] Notification reminders:",
                            {
                                upcomingBookings:
                                    upcomingResult.processed,

                                paymentExpiry:
                                    paymentResult.processed,
                            },
                        );
                    }
                } catch (error) {
                    console.error(
                        "[CRON] Notification reminder failed:",
                        error,
                    );
                }
            },
            {
                name: "notification-reminders",
                timezone: "UTC",
                noOverlap: true,
            },
        );

        console.log(
            "Notification reminder cron started",
        );
    };