export declare class NotificationQueueService {
    static enqueueEmail(notificationId: string): Promise<import("bullmq").Job<import("../queues/notification-email.queue.js").NotificationEmailJobData, any, string>>;
    static enqueuePush(notificationId: string): Promise<import("bullmq").Job<import("../queues/notification-push.queue.js").NotificationPushJobData, any, string>>;
    static enqueueEmailRetry(notificationId: string): Promise<import("bullmq").Job<import("../queues/notification-email.queue.js").NotificationEmailJobData, any, string>>;
    static enqueuePushRetry(notificationId: string): Promise<import("bullmq").Job<import("../queues/notification-push.queue.js").NotificationPushJobData, any, string>>;
}
//# sourceMappingURL=notification-queue.service.d.ts.map