import { Queue } from "bullmq";
import { redisQueueConnection } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES } from "./notification-queue.constants.js";

export interface NotificationPushJobData {
    notificationId: string;
}

export const notificationPushQueue = new Queue<NotificationPushJobData>(
    NOTIFICATION_QUEUE_NAMES.PUSH,
    {
        connection: redisQueueConnection,
        defaultJobOptions: {
            attempts: 4,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
        },
    },
);