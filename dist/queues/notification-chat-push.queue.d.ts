import { Queue } from "bullmq";
export interface ChatPushJobData {
    recipientId: string;
    conversationId: string;
    messageId: string;
    senderId: string;
    title: string;
    message: string;
    bookingId: string;
}
export declare const notificationChatPushQueue: Queue<ChatPushJobData, any, string, ChatPushJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-chat-push.queue.d.ts.map