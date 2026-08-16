import { Worker, } from "bullmq";
import { redisWorkerConnection, } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES, } from "../queues/notification-queue.constants.js";
import { NotificationService, } from "../services/notification.service.js";
export const notificationPushWorker = new Worker(NOTIFICATION_QUEUE_NAMES.PUSH, async (job) => {
    try {
        return await NotificationService
            .deliverPush(job.data.notificationId);
    }
    catch (error) {
        const maxAttempts = Number(job.opts.attempts ??
            1);
        const currentAttempt = job.attemptsMade +
            1;
        if (currentAttempt >=
            maxAttempts) {
            await NotificationService
                .markPushDeliveryFailed(job.data.notificationId, error);
        }
        throw error instanceof Error
            ? error
            : new Error("Push delivery failed");
    }
}, {
    connection: redisWorkerConnection,
    concurrency: 10,
});
notificationPushWorker.on("completed", (job) => {
    console.log(`[NOTIFICATION PUSH] Completed: ${job.id}`);
});
notificationPushWorker.on("failed", (job, error) => {
    console.error(`[NOTIFICATION PUSH] Failed: ${job?.id}`, error.message);
});
notificationPushWorker.on("error", (error) => {
    console.error("[NOTIFICATION PUSH] Worker error:", error);
});
//# sourceMappingURL=notification-push.worker.js.map