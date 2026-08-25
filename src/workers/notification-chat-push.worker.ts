import { Worker } from "bullmq";
import { redisWorkerConnection } from "../config/redis.js";
import { NOTIFICATION_QUEUE_NAMES } from "../queues/notification-queue.constants.js";
import type { ChatPushJobData } from "../queues/notification-chat-push.queue.js";
import { NotificationDeviceService } from "../services/notification-device.service.js";

export const notificationChatPushWorker = new Worker<ChatPushJobData>(
    NOTIFICATION_QUEUE_NAMES.CHAT_PUSH, async (job) => {
        const { recipientId, conversationId, messageId, senderId, title, message } = job.data;

        // Chat push intentionally bypasses the persistent Notification collection. ChatMessage + ChatConversation already own the canonical unread/read/delivery state.
        return NotificationDeviceService.sendToUser({
            userId: recipientId,
            title,
            message,
            data: { type: "CHAT_MESSAGE", conversationId, messageId, senderId },
        });
    }, { connection: redisWorkerConnection, concurrency: 20 },
);

notificationChatPushWorker.on("completed", (job) => { console.log(`[CHAT PUSH] Completed: ${job.id}`) });
notificationChatPushWorker.on("failed", (job, error) => { console.error(`[CHAT PUSH] Failed: ${job?.id}`, error.message) });
notificationChatPushWorker.on("error", (error) => { console.error("[CHAT PUSH] Worker error:", error); });