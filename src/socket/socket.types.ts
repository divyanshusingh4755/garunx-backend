import type { ChatMessageType } from "../models/chatmessage.model.js";
import type { Role } from "../types/rbac.js";
import type { NotificationSocketDto } from "./notification.dto.js";
import type { ChatMessageSocketDto } from "./socket.dto.js";

export interface TypingPayload {
  conversationId: string;
}

export interface TypingChangedEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceChangedEvent {
  userId: string;
  isOnline: boolean;
}

export interface MessageDeliveredPayload {
  conversationId: string;
  messageId: string;
}

export interface MessageDeliveredEvent {
  conversationId: string;
  userId: string;
  messageId: string;
  deliveredAt: string;
}

export interface PresenceStateEvent {
  conversationId: string;
  userId: string;
  isOnline: boolean;
}

export interface PresenceGetPayload {
  conversationId: string;
}

export interface ConversationJoinPayload {
  conversationId: string;
}

export interface ConversationLeavePayload {
  conversationId: string;
}

export interface ConversationJoinedPayload {
  conversationId: string;
}

export interface ConversationLeftPayload {
  conversationId: string;
}

export interface ConversationReadPayload {
  conversationId: string;
  messageId: string;
}

export interface ConversationReadEvent {
  conversationId: string;
  userId: string;
  messageId: string;
  readAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  clientMessageId: string;
  type: ChatMessageType;
  text?: string;
  images?: string[];
  replyToMessageId?: string;
}

export interface NotificationReadEvent {
  notificationId: string;
  readAt: string;
}

export interface NotificationReadAllEvent {
  readAt: string;
}

export interface NotificationDeletedEvent {
  notificationId: string;
}

export interface NotificationUnreadCountEvent {
  unreadCount: number;
}

export type SendMessageAck = { success: true, data: ChatMessageSocketDto } | { success: false, message: string }
export type ConversationReadAck = { success: true, data: ConversationReadEvent } | { success: false, message: string }
export type MessageDeliveredAck = { success: true, data: MessageDeliveredEvent } | { success: false, message: string }

export interface SocketErrorPayload {
  event: string;
  message: string;
}

export interface ClientToServerEvents {
  "conversation:join": (payload: ConversationJoinPayload) => void;
  "conversation:leave": (payload: ConversationLeavePayload) => void;
  "message:send": (payload: SendMessagePayload, callback: (response: SendMessageAck) => void) => void
  "conversation:read": (payload: ConversationReadPayload, callback: (response: ConversationReadAck) => void) => void
  "presence:get": (payload: PresenceGetPayload) => void;
  "message:delivered": (payload: MessageDeliveredPayload, callback: (response: MessageDeliveredAck) => void) => void
  "typing:start": (payload: TypingPayload) => void;
  "typing:stop": (payload: TypingPayload) => void;
}

export interface ServerToClientEvents {
  "conversation:joined": (payload: ConversationJoinedPayload) => void;
  "conversation:left": (payload: ConversationLeftPayload) => void;
  "message:created": (message: ChatMessageSocketDto) => void;
  "conversation:read": (payload: ConversationReadEvent) => void;
  "socket:error": (payload: SocketErrorPayload) => void;
  "presence:changed": (payload: PresenceChangedEvent) => void;
  "presence:state": (payload: PresenceStateEvent) => void;
  "conversation:delivered": (payload: MessageDeliveredEvent) => void;
  "typing:changed": (payload: TypingChangedEvent) => void;
  "notification:new": (notification: NotificationSocketDto) => void;
  "notification:read": (payload: NotificationReadEvent) => void;
  "notification:read-all": (payload: NotificationReadAllEvent) => void;
  "notification:deleted": (payload: NotificationDeletedEvent) => void;
  "notification:unread-count": (payload: NotificationUnreadCountEvent) => void;
}

export interface InterServerEvents { }

export interface SocketData {
  userId: string;
  role: Role;
}
