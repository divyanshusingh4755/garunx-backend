import { Queue, } from "bullmq";
import { redisQueueConnection, } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES, } from "./notification-queue.constants.js";
export const notificationPushQueue = new Queue(NOTIFICATION_QUEUE_NAMES.PUSH, {
    connection: redisQueueConnection,
    defaultJobOptions: {
        attempts: 4,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            count: 1000,
        },
        removeOnFail: {
            count: 5000,
        },
    },
});
//# sourceMappingURL=notification-push.queue.js.map