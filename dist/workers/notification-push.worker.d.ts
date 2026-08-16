import { Worker } from "bullmq";
import type { NotificationPushJobData } from "../queues/notification-push.queue.js";
export declare const notificationPushWorker: Worker<NotificationPushJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-push.worker.d.ts.map