import mongoose, { Types } from "mongoose";
import { ChatConversation, ChatConversationStatus } from "../models/chatconversation.model.js";
import { ChatMessage } from "../models/chatmessage.model.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

export class ChatConversationService {
  private static isMessageAtOrBefore(message: { _id: Types.ObjectId; createdAt: Date; }, target: { _id: Types.ObjectId; createdAt: Date; }): boolean {
    if (message.createdAt < target.createdAt) { return true }
    if (message.createdAt > target.createdAt) { return false; }
    return (message._id.toString() <= target._id.toString())
  }
  static async createForBooking(params: { bookingId: string; userId: string; coordinatorId: string; }) {
    const { bookingId, userId, coordinatorId } = params;

    if (!Types.ObjectId.isValid(bookingId)) { throw new Error("Invalid booking ID"); }
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }
    if (!Types.ObjectId.isValid(coordinatorId)) { throw new Error("Invalid coordinator ID"); }

    const bookingObjectId = new Types.ObjectId(bookingId);
    const userObjectId = new Types.ObjectId(userId);
    const coordinatorObjectId = new Types.ObjectId(coordinatorId);

    // createForBooking is intentionally idempotent, but it also synchronizes participants. This prevents a stale coordinator from retaining access if this method is ever called after an assignment change. Existing read/delivery pointers are preserved when the participant is still the same person.
    const existingConversation = await ChatConversation.findOne({ bookingId: bookingObjectId });
    const existingUserParticipant = existingConversation?.participants.find((participant) => participant.userId.toString() === userId);
    const existingCoordinatorParticipant = existingConversation?.participants.find((participant) => participant.userId.toString() === coordinatorId);

    const participants = [
      {
        userId: userObjectId,
        role: "USER" as const,
        ...(existingUserParticipant?.lastDeliveredMessageId && { lastDeliveredMessageId: existingUserParticipant.lastDeliveredMessageId }),
        ...(existingUserParticipant?.lastDeliveredAt && { lastDeliveredAt: existingUserParticipant.lastDeliveredAt }),
        ...(existingUserParticipant?.lastReadMessageId && { lastReadMessageId: existingUserParticipant.lastReadMessageId }),
        ...(existingUserParticipant?.lastReadAt && { lastReadAt: existingUserParticipant.lastReadAt }),
      },
      {
        userId: coordinatorObjectId,
        role: "COORDINATOR" as const,
        ...(existingCoordinatorParticipant?.lastDeliveredMessageId && { lastDeliveredMessageId: existingCoordinatorParticipant.lastDeliveredMessageId }),
        ...(existingCoordinatorParticipant?.lastDeliveredAt && { lastDeliveredAt: existingCoordinatorParticipant.lastDeliveredAt }),
        ...(existingCoordinatorParticipant?.lastReadMessageId && { lastReadMessageId: existingCoordinatorParticipant.lastReadMessageId }),
        ...(existingCoordinatorParticipant?.lastReadAt && { lastReadAt: existingCoordinatorParticipant.lastReadAt }),
      },
    ];

    const conversation = await ChatConversation.findOneAndUpdate(
      { bookingId: bookingObjectId },
      {
        $set: { participants, status: ChatConversationStatus.ACTIVE },
        $setOnInsert: { bookingId: bookingObjectId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const participantIdsToInvalidate = new Set<string>([userId, coordinatorId, ...(existingConversation?.participants.map((participant) => participant.userId.toString()) ?? []),]);

    await Promise.all(Array.from(participantIdsToInvalidate).map((participantId) => RedisCacheService.delete(CacheKeys.chatParticipantIds(participantId))));

    return conversation;
  }

  static async getByBookingId(params: { bookingId: string; requestedBy: string; }) {
    const { bookingId, requestedBy } = params;

    if (!Types.ObjectId.isValid(bookingId)) { throw new Error("Invalid booking ID"); }
    if (!Types.ObjectId.isValid(requestedBy)) { throw new Error("Invalid user ID"); }

    const conversation = await ChatConversation.findOne({ bookingId: new Types.ObjectId(bookingId), "participants.userId": new Types.ObjectId(requestedBy) });
    if (!conversation) { throw new Error("Chat conversation not found"); }
    return conversation;
  }

  static async getById(params: { conversationId: string; requestedBy: string; }) {
    const { conversationId, requestedBy } = params;

    if (!Types.ObjectId.isValid(conversationId)) { throw new Error("Invalid conversation ID"); }
    if (!Types.ObjectId.isValid(requestedBy)) { throw new Error("Invalid user ID"); }

    const conversation = await ChatConversation.findOne({ _id: new Types.ObjectId(conversationId), "participants.userId": new Types.ObjectId(requestedBy) });
    if (!conversation) { throw new Error("Chat conversation not found"); }

    return conversation;
  }

  static async assertParticipant(params: { conversationId: string; userId: string; requireActive?: boolean; }) {
    const { conversationId, userId, requireActive = false } = params;

    if (!Types.ObjectId.isValid(conversationId)) { throw new Error("Invalid conversation ID"); }
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }

    const query: Record<string, any> = { _id: new Types.ObjectId(conversationId), "participants.userId": new Types.ObjectId(userId) };
    if (requireActive) { query.status = ChatConversationStatus.ACTIVE; }

    const conversation = await ChatConversation.findOne(query);

    if (!conversation) {
      throw new Error(requireActive ? "Active chat conversation not found or access denied" : "Chat conversation not found or access denied");
    }

    return conversation;
  }

  static async markAsRead(params: { conversationId: string; userId: string; messageId: string; }): Promise<{ conversationId: string; userId: string; messageId: string; readAt: Date; }> {
    const { conversationId, userId, messageId } = params;

    if (!Types.ObjectId.isValid(conversationId)) { throw new Error("Invalid conversation ID"); }
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }
    if (!Types.ObjectId.isValid(messageId)) { throw new Error("Invalid message ID"); }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);
    const messageObjectId = new Types.ObjectId(messageId);

    let result: { conversationId: string; userId: string; messageId: string; readAt: Date; } | null = null;
    const session = await mongoose.startSession();

    try {
      // Read/check/write are kept in one transaction. If two read acknowledgements race, MongoDB will make one transaction retry after the competing write. The retried transaction then sees the newer pointer and cannot move it backwards.
      await session.withTransaction(async () => {
        const conversation = await ChatConversation.findOne({ _id: conversationObjectId, "participants.userId": userObjectId }).session(session);
        if (!conversation) { throw new Error("Chat conversation not found or access denied"); }

        const message = await ChatMessage.findOne({ _id: messageObjectId, conversationId: conversationObjectId }).select({ senderId: 1, createdAt: 1 }).session(session);
        if (!message) { throw new Error("Chat message not found"); }
        if (message.senderId.toString() === userId) { throw new Error("Cannot mark own message as read"); }

        const participant = conversation.participants.find((item) => item.userId.toString() === userId);
        if (!participant) { throw new Error("Chat participant not found"); }

        if (participant.lastReadMessageId) {
          const previousReadMessage = await ChatMessage.findOne({ _id: participant.lastReadMessageId, conversationId: conversationObjectId }).select({ _id: 1, createdAt: 1 }).session(session);
          if (previousReadMessage && this.isMessageAtOrBefore(message, previousReadMessage)) {
            result = {
              conversationId,
              userId,
              messageId: participant.lastReadMessageId.toString(),
              readAt: participant.lastReadAt ?? previousReadMessage.createdAt,
            };

            return;
          }
        }

        const readAt = new Date();
        const fieldsToSet: Record<string, unknown> = { "participants.$.lastReadMessageId": messageObjectId, "participants.$.lastReadAt": readAt };

        // Reading implies delivery, but do not move the delivery pointer backwards if it already points to a newer message.
        let shouldAdvanceDelivery = true;

        if (participant.lastDeliveredMessageId) {
          const previousDeliveredMessage = await ChatMessage.findOne({ _id: participant.lastDeliveredMessageId, conversationId: conversationObjectId }).select({ _id: 1, createdAt: 1 }).session(session);
          if (previousDeliveredMessage && this.isMessageAtOrBefore(message, previousDeliveredMessage)) {
            shouldAdvanceDelivery = false;
          }
        }

        if (shouldAdvanceDelivery) {
          fieldsToSet["participants.$.lastDeliveredMessageId"] = messageObjectId;
          fieldsToSet["participants.$.lastDeliveredAt"] = readAt;
        }

        const updateResult = await ChatConversation.updateOne(
          { _id: conversationObjectId, "participants.userId": userObjectId },
          { $set: fieldsToSet },
          { session },
        );

        if (updateResult.matchedCount === 0) { throw new Error("Failed to update read status"); }

        result = { conversationId, userId, messageId, readAt };
      });
    } finally {
      await session.endSession();
    }

    if (!result) { throw new Error("Failed to update read status"); }
    return result;
  }

  static async closeConversation(params: { conversationId: string; }) {
    const { conversationId } = params;
    if (!Types.ObjectId.isValid(conversationId)) { throw new Error("Invalid conversation ID"); }

    const conversation = await ChatConversation.findByIdAndUpdate(
      conversationId,
      { $set: { status: ChatConversationStatus.CLOSED } },
      { new: true },
    );

    if (!conversation) { throw new Error("Chat conversation not found"); }

    await Promise.all(conversation.participants.map((participant) => RedisCacheService.delete(CacheKeys.chatParticipantIds(participant.userId.toString()))));
    return conversation;
  }

  static async closeForBooking(params: { bookingId: string; }) {
    const { bookingId } = params;
    if (!Types.ObjectId.isValid(bookingId)) { throw new Error("Invalid booking ID"); }

    const conversation = await ChatConversation.findOneAndUpdate(
      { bookingId: new Types.ObjectId(bookingId) },
      { $set: { status: ChatConversationStatus.CLOSED } },
      { new: true },
    );

    if (conversation) { await Promise.all(conversation.participants.map((participant) => RedisCacheService.delete(CacheKeys.chatParticipantIds(participant.userId.toString())))); }
    return conversation;
  }

  static async getParticipantUserIds(params: { userId: string; }) {
    const { userId } = params;

    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }

    return RedisCacheService.getOrSet({
      key: CacheKeys.chatParticipantIds(userId),
      ttlSeconds: CACHE_TTL_SECONDS.CHAT_PARTICIPANT_IDS,

      loader: async () => {
        const conversations = await ChatConversation.find({ "participants.userId": new Types.ObjectId(userId), status: ChatConversationStatus.ACTIVE }).select({ participants: 1 }).lean();
        const participantIds = new Set<string>();

        for (const conversation of conversations) {
          for (const participant of conversation.participants) {
            const participantId = participant.userId.toString();
            if (participantId !== userId) { participantIds.add(participantId); }
          }
        }
        return Array.from(participantIds);
      },
    });
  }

  static async markAsDelivered(params: { conversationId: string; userId: string; messageId: string; }): Promise<{ conversationId: string; userId: string; messageId: string; deliveredAt: Date; }> {
    const { conversationId, userId, messageId } = params;

    if (!Types.ObjectId.isValid(conversationId)) { throw new Error("Invalid conversation ID"); }
    if (!Types.ObjectId.isValid(userId)) { throw new Error("Invalid user ID"); }
    if (!Types.ObjectId.isValid(messageId)) { throw new Error("Invalid message ID"); }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);
    const messageObjectId = new Types.ObjectId(messageId);

    let result: { conversationId: string; userId: string; messageId: string; deliveredAt: Date; } | null = null;
    const session = await mongoose.startSession();

    try {
      // Keep check + update in one transaction so concurrent delivery acknowledgements cannot move the pointer backwards.
      await session.withTransaction(async () => {
        const conversation = await ChatConversation.findOne({ _id: conversationObjectId, "participants.userId": userObjectId }).session(session);
        if (!conversation) { throw new Error("Chat conversation not found or access denied"); }

        const message = await ChatMessage.findOne({ _id: messageObjectId, conversationId: conversationObjectId }).select({ senderId: 1, createdAt: 1 }).session(session);
        if (!message) { throw new Error("Chat message not found"); }
        if (message.senderId.toString() === userId) {
          throw new Error("Sender cannot mark own message as delivered");
        }

        const participant = conversation.participants.find((item) => item.userId.toString() === userId);
        if (!participant) { throw new Error("Chat participant not found"); }

        if (participant.lastDeliveredMessageId) {
          const previousMessage = await ChatMessage.findOne({ _id: participant.lastDeliveredMessageId, conversationId: conversationObjectId }).select({ _id: 1, createdAt: 1 }).session(session);
          if (previousMessage && this.isMessageAtOrBefore(message, previousMessage)) {
            result = {
              conversationId,
              userId,
              messageId: participant.lastDeliveredMessageId.toString(),
              deliveredAt: participant.lastDeliveredAt ?? previousMessage.createdAt,
            };

            return;
          }
        }

        const deliveredAt = new Date();
        const updateResult = await ChatConversation.updateOne(
          { _id: conversationObjectId, "participants.userId": userObjectId },
          { $set: { "participants.$.lastDeliveredMessageId": messageObjectId, "participants.$.lastDeliveredAt": deliveredAt } },
          { session },
        );

        if (updateResult.matchedCount === 0) {
          throw new Error("Failed to update delivery status");
        }

        result = { conversationId, userId, messageId, deliveredAt };
      });
    } finally {
      await session.endSession();
    }

    if (!result) { throw new Error("Failed to update delivery status"); }
    return result;
  }
}