import { Worker } from "bullmq";
import { redisWorkerConnection } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES } from "../queues/notification-queue.constants.js";
import { NotificationService } from "../services/notification.service.js";
export const notificationEmailWorker = new Worker(NOTIFICATION_QUEUE_NAMES.EMAIL, async (job) => {
    try {
        return await NotificationService.deliverEmail(job.data.notificationId);
    }
    catch (error) {
        // attemptsMade contains the number of previous failed attempts. Therefore current attempt = attemptsMade + 1./
        const maxAttempts = Number(job.opts.attempts ?? 1);
        const currentAttempt = job.attemptsMade + 1;
        if (currentAttempt >= maxAttempts) {
            await NotificationService.markEmailDeliveryFailed(job.data.notificationId, error);
        }
        // BullMQ requires the worker processor to throw for its retry mechanism.
        throw error instanceof Error ? error : new Error("Email delivery failed");
    }
}, { connection: redisWorkerConnection, concurrency: 10 });
notificationEmailWorker.on("completed", (job) => { console.log(`[NOTIFICATION EMAIL] Completed: ${job.id}`); });
notificationEmailWorker.on("failed", (job, error) => { console.error(`[NOTIFICATION EMAIL] Failed: ${job?.id}`, error.message); });
notificationEmailWorker.on("error", (error) => { console.error("[NOTIFICATION EMAIL] Worker error:", error); });
//# sourceMappingURL=notification-email.worker.js.map