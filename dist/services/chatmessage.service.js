import { Types } from "mongoose";
import { ChatMessage, ChatMessageType } from "../models/chatmessage.model.js";
import { ChatConversationService } from "./chatconversation.service.js";
import { ChatConversation } from "../models/chatconversation.model.js";
import { toChatMessageSocketDto } from "../socket/socket.dto.js";
export class ChatMessageService {
    static async sendMessage(params) {
        const { conversationId, senderId, clientMessageId, type, text, images = [], replyToMessageId } = params;
        const normalizedText = text?.trim();
        const normalizedClientMessageId = clientMessageId?.trim();
        if (!Types.ObjectId.isValid(conversationId)) {
            throw new Error("Invalid conversation ID");
        }
        if (!Types.ObjectId.isValid(senderId)) {
            throw new Error("Invalid sender ID");
        }
        if (replyToMessageId && !Types.ObjectId.isValid(replyToMessageId)) {
            throw new Error("Invalid reply message ID");
        }
        if (!normalizedClientMessageId) {
            throw new Error("Client message ID is required");
        }
        if (![ChatMessageType.TEXT, ChatMessageType.IMAGE].includes(type)) {
            throw new Error("Message type must be TEXT or IMAGE");
        }
        if (normalizedText && normalizedText.length > 5000) {
            throw new Error("Message text cannot exceed 5000 characters");
        }
        if (!Array.isArray(images)) {
            throw new Error("Images must be an array");
        }
        if (images.length > 5) {
            throw new Error("Maximum 5 images are allowed per message");
        }
        switch (type) {
            case ChatMessageType.TEXT:
                if (!normalizedText) {
                    throw new Error("Text message cannot be empty");
                }
                if (images.length > 0) {
                    throw new Error("Text message cannot contain images");
                }
                break;
            case ChatMessageType.IMAGE:
                if (images.length === 0) {
                    throw new Error("Image message must contain at least one image");
                }
                break;
        }
        const conversation = await ChatConversationService.assertParticipant({
            conversationId,
            userId: senderId,
            requireActive: true,
        });
        const existingMessage = await ChatMessage.findOne({
            senderId: new Types.ObjectId(senderId),
            clientMessageId: normalizedClientMessageId,
        });
        if (existingMessage) {
            return {
                message: existingMessage,
                created: false,
            };
        }
        let replyMessage = null;
        if (replyToMessageId) {
            replyMessage = await ChatMessage.findOne({
                _id: new Types.ObjectId(replyToMessageId),
                conversationId: conversation._id,
            });
            if (!replyMessage) {
                throw new Error("Reply message not found in this conversation");
            }
        }
        const messageData = {
            conversationId: conversation._id,
            senderId: new Types.ObjectId(senderId),
            type,
            clientMessageId: normalizedClientMessageId,
        };
        if (normalizedText) {
            messageData.text = normalizedText;
        }
        if (images.length > 0) {
            messageData.images = images;
        }
        if (replyToMessageId) {
            messageData.replyToMessageId = new Types.ObjectId(replyToMessageId);
        }
        try {
            const message = await ChatMessage.create(messageData);
            await ChatConversation.findByIdAndUpdate(conversation._id, {
                $set: {
                    lastMessageAt: message.createdAt,
                },
            });
            return {
                message,
                created: true,
            };
        }
        catch (error) {
            if (error?.code === 11000) {
                const existingMessage = await ChatMessage.findOne({
                    senderId: new Types.ObjectId(senderId),
                    clientMessageId: normalizedClientMessageId
                });
                if (existingMessage) {
                    return {
                        message: existingMessage,
                        created: false,
                    };
                }
            }
            throw error;
        }
    }
    static async getMessages(params) {
        const { conversationId, requestedBy, cursor, limit = 30 } = params;
        if (!Types.ObjectId.isValid(conversationId)) {
            throw new Error("Invalid conversation ID");
        }
        if (!Types.ObjectId.isValid(requestedBy)) {
            throw new Error("Invalid user ID");
        }
        const conversation = await ChatConversationService.assertParticipant({
            conversationId,
            userId: requestedBy,
        });
        const otherParticipant = conversation.participants.find((participant) => participant.userId.toString() !== requestedBy);
        let lastDeliveredMessage = null;
        let lastReadMessage = null;
        if (otherParticipant?.lastDeliveredMessageId) {
            lastDeliveredMessage = await ChatMessage.findOne({
                _id: otherParticipant.lastDeliveredMessageId,
                conversationId: new Types.ObjectId(conversationId)
            });
        }
        if (otherParticipant?.lastReadMessageId) {
            lastReadMessage = await ChatMessage.findOne({
                _id: otherParticipant.lastReadMessageId,
                conversationId: new Types.ObjectId(conversationId)
            });
        }
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 30;
        const query = {
            conversationId: new Types.ObjectId(conversationId),
        };
        if (cursor) {
            if (!Types.ObjectId.isValid(cursor)) {
                throw new Error("Invalid message cursor");
            }
            const cursorMessage = await ChatMessage.findOne({
                _id: new Types.ObjectId(cursor),
                conversationId: new Types.ObjectId(conversationId),
            }).select({ _id: 1, createdAt: 1 });
            if (!cursorMessage) {
                throw new Error("Message cursor not found");
            }
            query.$or = [
                {
                    createdAt: {
                        $lt: cursorMessage.createdAt,
                    },
                },
                {
                    createdAt: cursorMessage.createdAt,
                    _id: {
                        $lt: cursorMessage._id,
                    },
                },
            ];
        }
        const messages = await ChatMessage.find(query).sort({ createdAt: -1, _id: -1 }).limit(safeLimit + 1);
        const hasMore = messages.length > safeLimit;
        const result = hasMore ? messages.slice(0, safeLimit) : messages;
        const nextCursor = hasMore && result && result.length > 0 ? result[result.length - 1]?._id.toString() ?? null : null;
        const replyMessageIds = result.map((message) => message.replyToMessageId).filter((messageId) => Boolean(messageId));
        const replyMessages = replyMessageIds.length > 0 ? await ChatMessage.find({
            _id: {
                $in: replyMessageIds
            },
            conversationId: new Types.ObjectId(conversationId)
        }) : [];
        const replyMessageMap = new Map(replyMessages.map((message) => [
            message._id.toString(),
            message
        ]));
        const formattedMessages = result.map((message) => {
            const replyMessage = message.replyToMessageId
                ?
                    replyMessageMap.get(message.replyToMessageId.toString()) ?? null
                : null;
            if (message.senderId.toString() === requestedBy) {
                return toChatMessageSocketDto(message, {
                    lastDeliveredMessage,
                    lastReadMessage,
                    replyMessage,
                    includeDeliveryStatus: true,
                });
            }
            return toChatMessageSocketDto(message, { replyMessage });
        });
        return {
            messages: formattedMessages,
            nextCursor,
            hasMore
        };
    }
    static async getUnreadCount(params) {
        const { conversationId, userId } = params;
        if (!Types.ObjectId.isValid(conversationId)) {
            throw new Error("Invalid conversation ID");
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
        const conversation = await ChatConversationService.assertParticipant({
            conversationId,
            userId
        });
        const participant = conversation.participants.find((participant) => participant.userId.toString() === userId);
        if (!participant) {
            throw new Error("Chat participant not found");
        }
        const query = {
            conversationId: new Types.ObjectId(conversationId),
            senderId: {
                $ne: new Types.ObjectId(userId)
            }
        };
        if (participant.lastReadMessageId) {
            const lastReadMessage = await ChatMessage.findOne({
                _id: participant.lastReadMessageId,
                conversationId: new Types.ObjectId(conversationId),
            }).select({
                _id: 1,
                createdAt: 1,
            });
            if (lastReadMessage) {
                query.$or = [
                    {
                        createdAt: {
                            $gt: lastReadMessage.createdAt,
                        },
                    },
                    {
                        createdAt: lastReadMessage.createdAt,
                        _id: {
                            $gt: lastReadMessage._id,
                        },
                    },
                ];
            }
        }
        const unreadCount = await ChatMessage.countDocuments(query);
        return unreadCount;
    }
}
//# sourceMappingURL=chatmessage.service.js.map