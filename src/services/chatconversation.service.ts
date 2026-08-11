import { Types } from "mongoose";
import {
  ChatConversation,
  ChatConversationStatus,
} from "../models/chatconversation.model.js";
import { ChatMessage } from "../models/chatmessage.model.js";

export class ChatConversationService {
  private static isMessageAtOrBefore(
    message: {
      _id: Types.ObjectId;
      createdAt: Date;
    },
    target: {
      _id: Types.ObjectId;
      createdAt: Date;
    }): boolean {
    if (message.createdAt < target.createdAt) {
      return true
    }

    if (message.createdAt > target.createdAt) {
      return false;
    }

    return (message._id.toString() <= target._id.toString())
  }
  static async createForBooking(params: {
    bookingId: string;
    userId: string;
    coordinatorId: string;
  }) {
    const { bookingId, userId, coordinatorId } = params;

    if (!Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!Types.ObjectId.isValid(coordinatorId)) {
      throw new Error("Invalid coordinator ID");
    }

    const bookingObjectId = new Types.ObjectId(bookingId);
    const userObjectId = new Types.ObjectId(userId);
    const coordinatorObjectId = new Types.ObjectId(coordinatorId);

    const conversation = await ChatConversation.findOneAndUpdate(
      { bookingId: bookingObjectId },
      {
        $setOnInsert: {
          bookingId: bookingObjectId,
          participants: [
            {
              userId: userObjectId,
              role: "USER",
            },
            {
              userId: coordinatorObjectId,
              role: "COORDINATOR",
            },
          ],
          status: ChatConversationStatus.ACTIVE,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return conversation;
  }

  static async getByBookingId(params: {
    bookingId: string;
    requestedBy: string;
  }) {
    const { bookingId, requestedBy } = params;

    if (!Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }

    if (!Types.ObjectId.isValid(requestedBy)) {
      throw new Error("Invalid user ID");
    }

    const conversation = await ChatConversation.findOne({
      bookingId: new Types.ObjectId(bookingId),
      "participants.userId": new Types.ObjectId(requestedBy),
    });

    if (!conversation) {
      throw new Error("Chat conversation not found");
    }

    return conversation;
  }

  static async getById(params: {
    conversationId: string;
    requestedBy: string;
  }) {
    const { conversationId, requestedBy } = params;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation ID");
    }

    if (!Types.ObjectId.isValid(requestedBy)) {
      throw new Error("Invalid user ID");
    }

    const conversation = await ChatConversation.findOne({
      _id: new Types.ObjectId(conversationId),
      "participants.userId": new Types.ObjectId(requestedBy),
    });

    if (!conversation) {
      throw new Error("Chat conversation not found");
    }

    return conversation;
  }

  static async assertParticipant(params: {
    conversationId: string;
    userId: string;
    requireActive?: boolean;
  }) {
    const { conversationId, userId, requireActive = false } = params;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation ID");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const query: Record<string, any> = {
      _id: new Types.ObjectId(conversationId),
      "participants.userId": new Types.ObjectId(userId),
    };

    if (requireActive) {
      query.status = ChatConversationStatus.ACTIVE;
    }

    const conversation = await ChatConversation.findOne(query);

    if (!conversation) {
      throw new Error(
        requireActive
          ? "Active chat conversation not found or access denied"
          : "Chat conversation not found or access denied",
      );
    }

    return conversation;
  }

  static async markAsRead(params: { conversationId: string; userId: string, messageId: string }) {
    const { conversationId, userId, messageId } = params;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation ID");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error("Invalid message ID")
    }

    const conversationObjectId = new Types.ObjectId(conversationId);

    const userObjectId = new Types.ObjectId(userId);

    const messageObjectId = new Types.ObjectId(messageId);

    const conversation = await ChatConversation.findOne(
      {
        _id: conversationObjectId,
        "participants.userId": userObjectId,
      });

    if (!conversation) {
      throw new Error("Chat conversation not found or access denied");
    }

    const message = await ChatMessage.findOne({
      _id: messageObjectId,
      conversationId: conversationObjectId
    }).select({ senderId: 1, createdAt: 1 })

    if (!message) {
      throw new Error("Chat message not found")
    }

    if (message.senderId.toString() === userId) {
      throw new Error("Cannot mark own message as read")
    }

    const participant = conversation.participants.find((participant) => participant.userId.toString() === userId);

    if (!participant) {
      throw new Error("Chat participant not found")
    }

    // Prevent read pointer from moving backwards
    if (participant.lastReadMessageId) {
      const previousMessage = await ChatMessage.findOne({
        _id: participant.lastReadMessageId,
        conversationId: conversationObjectId
      }).select({ createdAt: 1 })

      if (previousMessage && this.isMessageAtOrBefore(message, previousMessage)) {
        return {
          conversationId,
          userId,
          messageId: participant.lastReadMessageId.toString(),
          readAt: participant.lastReadAt ?? previousMessage.createdAt
        }
      }
    }

    const readAt = new Date();

    const updatedConversation = await ChatConversation.findOneAndUpdate(
      {
        _id: conversationObjectId,
        participants: {
          $elemMatch: {
            userId: userObjectId
          }
        }
      },
      {
        $set: {
          "participants.$.lastReadMessageId": messageObjectId,
          "participants.$.lastReadAt": readAt,
          // Read also implies delivered
          "participants.$.lastDeliveredMessageId": messageObjectId,
          "participants.$.lastDeliveredAt": readAt
        }
      },
      {
        new: true
      }
    )

    if (!updatedConversation) {
      throw new Error("Failed to update read status")
    }


    return {
      conversationId,
      userId,
      messageId,
      readAt
    };
  }

  static async closeConversation(params: { conversationId: string }) {
    const { conversationId } = params;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation ID");
    }

    const conversation = await ChatConversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          status: ChatConversationStatus.CLOSED,
        },
      },
      {
        new: true,
      },
    );

    if (!conversation) {
      throw new Error("Chat conversation not found");
    }

    return conversation;
  }

  static async closeForBooking(params: {
    bookingId: string;
  }) {
    const { bookingId } = params;

    if (!Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }

    const conversation = await ChatConversation.findOneAndUpdate(
      {
        bookingId: new Types.ObjectId(bookingId),
      },
      {
        $set: {
          status: ChatConversationStatus.CLOSED
        }
      },
      {
        new: true,
      }
    )

    return conversation
  }

  static async getParticipantUserIds(params: {
    userId: string
  }) {
    const { userId } = params;
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const conversations = await ChatConversation.find({
      "participants.userId": new Types.ObjectId(userId)
    }).select({ participants: 1 });

    const participantIds = new Set<string>();

    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        const participantId = participant.userId.toString();

        if (participantId !== userId) {
          participantIds.add(participantId);
        }
      }
    }

    return Array.from(participantIds);
  }

  static async markAsDelivered(params: {
    conversationId: string;
    userId: string;
    messageId: string;
  }) {
    const { conversationId, userId, messageId } = params;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation ID")
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID")
    }

    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error("Invalid message ID")
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);
    const messageObjectId = new Types.ObjectId(messageId);

    const conversation = await ChatConversation.findOne({
      _id: conversationObjectId,
      "participants.userId": userObjectId
    })

    if (!conversation) {
      throw new Error("Chat conversation not found or access denied")
    }

    const message = await ChatMessage.findOne({
      _id: messageObjectId,
      conversationId: conversationObjectId,
    }).select({ senderId: 1, createdAt: 1 });

    if (!message) {
      throw new Error("Chat message not found")
    }

    if (message.senderId.toString() === userId) {
      throw new Error("Sender cannot mark own message as delivered")
    }

    const participant = conversation.participants.find((participant) => participant.userId.toString() === userId)

    if (!participant) {
      throw new Error("Chat participant not found")
    }

    if (participant.lastDeliveredMessageId) {
      const previousMessage = await ChatMessage.findOne({
        _id: participant.lastDeliveredMessageId,
        conversationId: conversationObjectId
      }).select({ createdAt: 1 });

      if (previousMessage && this.isMessageAtOrBefore(message, previousMessage)) {
        return {
          conversationId,
          userId,
          messageId: participant.lastDeliveredMessageId.toString(),
          deliveredAt: participant.lastDeliveredAt ?? previousMessage.createdAt
        }
      }
    }

    const deliveredAt = new Date();

    const updatedConversation = await ChatConversation.findOneAndUpdate(
      {
        _id: conversationObjectId,
        participants: {
          $elemMatch: {
            userId: userObjectId
          }
        }
      },
      {
        $set: {
          "participants.$.lastDeliveredMessageId": messageObjectId,
          "participants.$.lastDeliveredAt": deliveredAt
        }
      },
      {
        new: true
      }
    )

    if (!updatedConversation) {
      throw new Error("Failed to update deilvery status")
    }

    return {
      conversationId,
      userId,
      messageId,
      deliveredAt
    }
  }
}
