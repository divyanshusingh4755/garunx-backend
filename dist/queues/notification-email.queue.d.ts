import { Queue } from "bullmq";
export interface NotificationEmailJobData {
    notificationId: string;
}
export declare const notificationEmailQueue: Queue<NotificationEmailJobData, any, string, NotificationEmailJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-email.queue.d.ts.map