import { Queue } from "bullmq";
export interface NotificationPushJobData {
    notificationId: string;
}
export declare const notificationPushQueue: Queue<NotificationPushJobData, any, string, NotificationPushJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-push.queue.d.ts.map