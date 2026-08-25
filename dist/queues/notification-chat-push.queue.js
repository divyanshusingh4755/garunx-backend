import { Queue } from "bullmq";
import { NOTIFICATION_QUEUE_NAMES } from "./notification-queue.constants.js";
import { redisQueueConnection } from "../config/redis.js";
export const notificationChatPushQueue = new Queue(NOTIFICATION_QUEUE_NAMES.CHAT_PUSH, {
    connection: redisQueueConnection,
    defaultJobOptions: {
        attempts: 4,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
    },
});
//# sourceMappingURL=notification-chat-push.queue.js.map