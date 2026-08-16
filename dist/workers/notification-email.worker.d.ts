import { Worker } from "bullmq";
import type { NotificationEmailJobData } from "../queues/notification-email.queue.js";
export declare const notificationEmailWorker: Worker<NotificationEmailJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-email.worker.d.ts.map