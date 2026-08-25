export const toNotificationSocketDto = (notification) => {
    return {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        ...(notification.referenceId && { referenceId: notification.referenceId.toString() }),
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
    };
};
//# sourceMappingURL=notification.dto.js.map