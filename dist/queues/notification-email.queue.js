import { Queue } from "bullmq";
import { redisQueueConnection } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES } from "./notification-queue.constants.js";
export const notificationEmailQueue = new Queue(NOTIFICATION_QUEUE_NAMES.EMAIL, {
    connection: redisQueueConnection,
    defaultJobOptions: {
        // Total attempts, including first attempt.
        attempts: 4,
        // BullMQ will automatically retry failed jobs.
        backoff: { type: "exponential", delay: 5000 },
        // Don't keep unlimited completed jobs in Redis.
        removeOnComplete: { count: 1000 },
        // Keep more failed jobs for debugging.
        removeOnFail: { count: 5000 },
    },
});
//# sourceMappingURL=notification-email.queue.js.map