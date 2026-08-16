export declare class ChatPushQueueService {
    static enqueue(params: {
        recipientId: string;
        conversationId: string;
        messageId: string;
        senderId: string;
        title: string;
        message: string;
    }): Promise<import("bullmq").Job<import("../queues/notification-chat-push.queue.js").ChatPushJobData, any, string>>;
}
//# sourceMappingURL=chat-push-queue.service.d.ts.map