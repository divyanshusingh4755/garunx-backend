import {
    notificationEmailQueue,
} from "../queues/notification-email.queue.js";

import {
    notificationPushQueue,
} from "../queues/notification-push.queue.js";

export class NotificationQueueService {
    static async enqueueEmail(
        notificationId: string,
    ) {
        return notificationEmailQueue.add(
            "send-email",
            {
                notificationId,
            },
            {
                jobId:
                    `email-${notificationId}`,
            },
        );
    }

    static async enqueuePush(
        notificationId: string,
    ) {
        return notificationPushQueue.add(
            "send-push",
            {
                notificationId,
            },
            {
                jobId:
                    `push-${notificationId}`,
            },
        );
    }

    static async enqueueEmailRetry(
        notificationId: string,
    ) {
        return notificationEmailQueue.add(
            "send-email",
            {
                notificationId,
            },
            {
                jobId:
                    `email-retry-${notificationId}-${Date.now()}`,
            },
        );
    }

    static async enqueuePushRetry(
        notificationId: string,
    ) {
        return notificationPushQueue.add(
            "send-push",
            {
                notificationId,
            },
            {
                jobId:
                    `push-retry-${notificationId}-${Date.now()}`,
            },
        );
    }
}