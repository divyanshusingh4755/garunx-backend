import type { INotification, NotificationType } from "../models/notification.model.js";
export interface NotificationSocketDto {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string;
    isRead: boolean;
    createdAt: string;
}
export declare const toNotificationSocketDto: (notification: INotification) => NotificationSocketDto;
//# sourceMappingURL=notification.dto.d.ts.map