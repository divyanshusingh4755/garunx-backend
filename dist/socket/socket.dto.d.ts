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
export declare const toChatMessageSocketDto: (message: IChatMessage, options?: {
    lastDeliveredMessage?: IChatMessage | null;
    lastReadMessage?: IChatMessage | null;
    replyMessage?: IChatMessage | null;
    includeDeliveryStatus?: boolean;
}) => ChatMessageSocketDto;
export declare const getMessageDeliveryStatus: (message: IChatMessage, state?: {
    lastDeliveredMessage?: IChatMessage | null;
    lastReadMessage?: IChatMessage | null;
}) => "SENT" | "DELIVERED" | "READ";
//# sourceMappingURL=socket.dto.d.ts.map