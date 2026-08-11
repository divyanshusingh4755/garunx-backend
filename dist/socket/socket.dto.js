export const toChatMessageSocketDto = (message, options) => {
    const dto = {
        id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        type: message.type,
        ...(message.text ? { text: message.text } : {}),
        images: message.images,
        clientMessageId: message.clientMessageId,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        ...(options?.includeDeliveryStatus ? { deliveryStatus: getMessageDeliveryStatus(message, options) } : {})
    };
    if (options?.replyMessage) {
        const replyMessage = options.replyMessage;
        dto.replyTo = {
            id: replyMessage._id.toString(),
            senderId: replyMessage.senderId.toString(),
            type: replyMessage.type,
            ...(replyMessage.text ? { text: replyMessage.text } : {}),
            ...(replyMessage.images.length > 0 ? { image: replyMessage.images[0] } : {})
        };
    }
    return dto;
};
export const getMessageDeliveryStatus = (message, state) => {
    const isAtOrBefore = (target) => {
        if (message.createdAt < target.createdAt) {
            return true;
        }
        if (message.createdAt > target.createdAt) {
            return false;
        }
        return (message._id.toString() <= target._id.toString());
    };
    if (state?.lastReadMessage && isAtOrBefore(state.lastReadMessage)) {
        return "READ";
    }
    if (state?.lastDeliveredMessage && isAtOrBefore(state.lastDeliveredMessage)) {
        return "DELIVERED";
    }
    return "SENT";
};
//# sourceMappingURL=socket.dto.js.map