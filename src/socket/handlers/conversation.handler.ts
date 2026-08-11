import { Types } from "mongoose";
import type { ChatSocket, ChatSocketServer } from "../index.js";
import { ChatConversationService } from "../../services/chatconversation.service.js";
import { getConversationRoom, getUserRoom } from "../socket.rooms.js";
import { ChatMessage, ChatMessageType, type IChatMessage } from "../../models/chatmessage.model.js";
import { ChatMessageService } from "../../services/chatmessage.service.js";
import { toChatMessageSocketDto } from "../socket.dto.js";
import { isUserOnline } from "../socket.presence.js";

export const registerReadHandlers = (io: ChatSocketServer, socket: ChatSocket): void => {
  socket.on("conversation:read", async (payload, callback) => {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid read payload")
      }

      const { conversationId, messageId } = payload;
      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      if (!messageId || !Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid message ID")
      }

      const userId = socket.data.userId;
      const room = getConversationRoom(conversationId);

      // Require this socket to actually be inside the conversation
      if (!socket.rooms.has(room)) {
        throw new Error("Join the conversation before marking it as read")
      }

      const result = await ChatConversationService.markAsRead({
        conversationId,
        userId,
        messageId
      })

      const readEvent = {
        conversationId: result.conversationId,
        userId: result.userId,
        messageId: result.messageId,
        readAt: result.readAt.toISOString()
      }

      // ACK caller
      callback({
        success: true,
        data: readEvent
      })

      // Tell other sockets in the room that this user has read the chat
      const conversation = await ChatConversationService.getById({
        conversationId,
        requestedBy: userId,
      });

      const otherParticipant = conversation.participants.find(
        (participant) => participant.userId.toString() !== userId
      )

      if (otherParticipant) {
        io.to(getUserRoom(otherParticipant.userId.toString())).emit("conversation:read", readEvent)
      }

      socket.to(getUserRoom(userId)).emit("conversation:read", readEvent);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to mark conversation as read";

      callback({
        success: false,
        message
      })
    }
  })
}

export const registerMessageHandlers = (io: ChatSocketServer, socket: ChatSocket): void => {
  socket.on("message:send", async (payload, callback) => {
    const senderId = socket.data.userId;

    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid message payload")
      }

      const { conversationId, clientMessageId, type, text, images, replyToMessageId } = payload;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      if (!clientMessageId || typeof clientMessageId !== "string" || !clientMessageId.trim()) {
        throw new Error("Client message ID is required")
      }

      if (type !== ChatMessageType.TEXT && type !== ChatMessageType.IMAGE) {
        throw new Error("Message type must be TEXT or IMAGE")
      }
      const room = getConversationRoom(conversationId);

      // Require the socket to have joined this conversation first.
      if (!socket.rooms.has(room)) {
        throw new Error("Join the conversation before sending messages")
      }

      // Actual authorization + business
      const { message, created } = await ChatMessageService.sendMessage({
        conversationId,
        senderId,
        clientMessageId,
        type,
        ...(typeof text === "string" ? { text } : {}),
        ...(Array.isArray(images) ? { images } : {}),
        ...(typeof replyToMessageId === "string" ? { replyToMessageId } : {}),
      })

      let replyMessage: IChatMessage | null = null;
      if (message.replyToMessageId) {
        replyMessage = await ChatMessage.findOne({
          _id: message.replyToMessageId,
          conversationId: message.conversationId,
        });
      }

      const messageDto = {
        ...toChatMessageSocketDto(message, {
          replyMessage
        }),
        deliveryStatus: "SENT" as const,
      }

      // Ack the originating ChatSocket
      callback({ success: true, data: messageDto })

      // Broadcast to everyone else currently inside this conversation room.
      if (created) {
        const conversation = await ChatConversationService.getById({
          conversationId,
          requestedBy: senderId
        })

        // Send the created message to every participant's
        for (const participant of conversation.participants) {
          const participantId = participant.userId.toString();

          socket.to(getUserRoom(participantId)).emit("message:created", messageDto)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      callback({ success: false, message })
    }
  })
}

export const registerConversationHandlers = (_io: ChatSocketServer, socket: ChatSocket): void => {
  // Join booking conversation
  socket.on("conversation:join", async ({ conversationId }: { conversationId: string }) => {
    try {
      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      // UserId came from JWT authentication
      const userId = socket.data.userId;
      await ChatConversationService.assertParticipant({
        conversationId,
        userId
      })

      const room = getConversationRoom(conversationId)
      await socket.join(room);

      socket.emit("conversation:joined", { conversationId })
      console.log(`User ${userId} joined ${room}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to join conversation"
      socket.emit("socket:error", {
        event: "conversation:join",
        message
      })
    }
  })

  // Leaver conversation
  socket.on("conversation:leave", async ({ conversationId }: { conversationId: string }) => {
    try {
      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      const room = getConversationRoom(conversationId);
      await socket.leave(room)

      socket.emit("conversation:left", { conversationId });
      console.log(`User ${socket.data.userId} left ${room}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to leave conversation";
      socket.emit("socket:error", {
        event: "conversation:leave",
        message
      })
    }
  })
}

export const registerPresenceHandlers = (_io: ChatSocketServer, socket: ChatSocket): void => {
  socket.on("presence:get", async (payload) => {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid presence payload")
      }

      const { conversationId } = payload;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID");
      }

      const currentUserId = socket.data.userId;
      const conversation = await ChatConversationService.assertParticipant({
        conversationId,
        userId: currentUserId
      })

      const otherParticipant = conversation.participants.find((participant) => participant.userId.toString() !== currentUserId);

      if (!otherParticipant) {
        throw new Error("Other chat participant not found")
      }

      const otherUserId = otherParticipant.userId.toString();

      socket.emit("presence:state", {
        conversationId,
        userId: otherUserId,
        isOnline: isUserOnline(otherUserId)
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to get presence";

      socket.emit("socket:error", {
        event: "presence:get",
        message
      })
    }
  })
}

export const registerDeliveryHandlers = (io: ChatSocketServer, socket: ChatSocket): void => {
  socket.on("message:delivered", async (payload, callback) => {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid delivery payload")
      }

      const { conversationId, messageId } = payload;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      if (!messageId || !Types.ObjectId.isValid(messageId)) {
        throw new Error("Invalid message ID")
      }

      const userId = socket.data.userId;

      const result = await ChatConversationService.markAsDelivered({
        conversationId,
        userId,
        messageId
      });

      const deliveredEvent = {
        conversationId: result.conversationId,
        userId: result.userId,
        messageId: result.messageId,
        deliveredAt: result.deliveredAt?.toISOString()
      };

      callback({
        success: true,
        data: deliveredEvent
      });

      const conversation = await ChatConversationService.getById({
        conversationId,
        requestedBy: userId,
      });

      const senderParticipant = conversation.participants.find((participant) => participant.userId.toString() !== userId);
      if (!senderParticipant) {
        return;
      }

      io.to(getUserRoom(senderParticipant.userId.toString())).emit("conversation:delivered", deliveredEvent)
      socket.to(getUserRoom(userId)).emit("conversation:delivered", deliveredEvent);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to mark as delivered"

      callback({
        success: false,
        message
      })
    }
  })
}

export const registerTypingHandlers = (_io: ChatSocketServer, socket: ChatSocket): void => {
  socket.on("typing:start", async (payload) => {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid typing payload")
      }

      const { conversationId } = payload;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID");
      }

      const userId = socket.data.userId;
      const room = getConversationRoom(conversationId);

      if (!socket.rooms.has(room)) {
        throw new Error("Join the conversation before typing")
      }

      await ChatConversationService.assertParticipant({
        conversationId,
        userId,
        requireActive: true,
      });

      socket.to(room).emit("typing:changed", {
        conversationId,
        userId,
        isTyping: true
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start typing";
      socket.emit("socket:error", {
        event: "typing:start",
        message,
      })
    }
  });

  socket.on("typing:stop", async (payload) => {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid typing payload")
      }

      const { conversationId } = payload;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        throw new Error("Invalid conversation ID")
      }

      const userId = socket.data.userId;
      const room = getConversationRoom(conversationId);

      if (!socket.rooms.has(room)) {
        return;
      }

      await ChatConversationService.assertParticipant({
        conversationId,
        userId,
        requireActive: true,
      });

      socket.to(room).emit("typing:changed", {
        conversationId,
        userId,
        isTyping: false
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to stop typing";
      socket.emit("socket:error", {
        event: "typing:stop",
        message
      })
    }
  })
}