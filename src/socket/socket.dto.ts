import type { IChatMessage } from "../models/chatmessage.model.js";

export interface ChatReplyPreviewDto {
  id: string;
  senderId: string;
  type: string;
  text?: string;
  image?: string;
}

export interface ChatMessageSocketDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  text?: string;
  images: string[];
  clientMessageId: string;
  createdAt: string;
  updatedAt: string;
  replyTo?: ChatReplyPreviewDto;
  deliveryStatus?: "SENT" | "DELIVERED" | "READ";
}

export const toChatMessageSocketDto = (
  message: IChatMessage,
  options?: {
    lastDeliveredMessage?: IChatMessage | null;
    lastReadMessage?: IChatMessage | null;
    replyMessage?: IChatMessage | null;
    includeDeliveryStatus?: boolean;
  }
): ChatMessageSocketDto => {

  const dto: ChatMessageSocketDto = {
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
  }

  if (options?.replyMessage) {
    const replyMessage = options.replyMessage;

    dto.replyTo = {
      id: replyMessage._id.toString(),
      senderId: replyMessage.senderId.toString(),
      type: replyMessage.type,
      ...(replyMessage.text ? { text: replyMessage.text } : {}),
      ...(replyMessage.images.length > 0 ? { image: replyMessage.images[0] } : {})
    }
  }

  return dto;
}

export const getMessageDeliveryStatus = (
  message: IChatMessage,
  state?: {
    lastDeliveredMessage?: IChatMessage | null;
    lastReadMessage?: IChatMessage | null
  }): "SENT" | "DELIVERED" | "READ" => {

  const isAtOrBefore = (target: IChatMessage): boolean => {
    if (message.createdAt < target.createdAt) { return true; }
    if (message.createdAt > target.createdAt) { return false; }
    return (message._id.toString() <= target._id.toString())
  }

  if (state?.lastReadMessage && isAtOrBefore(state.lastReadMessage)) { return "READ" }
  if (state?.lastDeliveredMessage && isAtOrBefore(state.lastDeliveredMessage)) { return "DELIVERED" }

  return "SENT"
}