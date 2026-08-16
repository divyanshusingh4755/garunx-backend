import { Worker } from "bullmq";
import type { ChatPushJobData } from "../queues/notification-chat-push.queue.js";
export declare const notificationChatPushWorker: Worker<ChatPushJobData, any, string, import("bullmq").RedisQueueBackend>;
//# sourceMappingURL=notification-chat-push.worker.d.ts.map