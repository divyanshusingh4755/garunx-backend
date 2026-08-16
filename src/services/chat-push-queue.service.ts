import {
    notificationChatPushQueue,
} from "../queues/notification-chat-push.queue.js";

export class ChatPushQueueService {
    static async enqueue(params: {
        recipientId: string;
        conversationId: string;
        messageId: string;
        senderId: string;
        title: string;
        message: string;
    }) {
        const {
            recipientId,
            conversationId,
            messageId,
            senderId,
            title,
            message,
        } = params;

        return notificationChatPushQueue.add(
            "send-chat-push",
            {
                recipientId,
                conversationId,
                messageId,
                senderId,
                title,
                message,
            },
            {
                /*
                 * The message ID is unique, so retries of the
                 * same API/socket message cannot enqueue another
                 * push job for the same recipient.
                 */
                jobId:
                    `chat-push-${messageId}-${recipientId}`,
            },
        );
    }
}