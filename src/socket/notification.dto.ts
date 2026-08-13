import type {
    INotification,
    NotificationType,
} from "../models/notification.model.js";

export interface NotificationSocketDto {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string;
    isRead: boolean;
    createdAt: string;
}

export const toNotificationSocketDto = (
    notification: INotification,
): NotificationSocketDto => {
    return {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        ...(notification.referenceId && {
            referenceId:
                notification.referenceId.toString(),
        }),
        isRead: notification.isRead,
        createdAt:
            notification.createdAt.toISOString(),
    };
};