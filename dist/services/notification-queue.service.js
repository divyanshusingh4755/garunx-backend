import { notificationEmailQueue } from "../queues/notification-email.queue.js";
import { notificationPushQueue } from "../queues/notification-push.queue.js";
export class NotificationQueueService {
    static async enqueueEmail(notificationId) {
        return notificationEmailQueue.add("send-email", { notificationId }, { jobId: `email-${notificationId}` });
    }
    static async enqueuePush(notificationId) {
        return notificationPushQueue.add("send-push", { notificationId }, { jobId: `push-${notificationId}` });
    }
    static async enqueueEmailRetry(notificationId) {
        return notificationEmailQueue.add("send-email", { notificationId }, { jobId: `email-retry-${notificationId}-${Date.now()}` });
    }
    static async enqueuePushRetry(notificationId) {
        return notificationPushQueue.add("send-push", { notificationId }, { jobId: `push-retry-${notificationId}-${Date.now()}` });
    }
}
//# sourceMappingURL=notification-queue.service.js.map