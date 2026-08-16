import { ChatMessageType, type IChatMessage } from "../models/chatmessage.model.js";
export interface SendMessageResult {
    message: IChatMessage;
    created: boolean;
}
export declare class ChatMessageService {
    private static buildPushPreview;
    private static enqueuePushSafely;
    static sendMessage(params: {
        conversationId: string;
        senderId: string;
        clientMessageId: string;
        type: ChatMessageType;
        text?: string;
        images?: string[];
        replyToMessageId?: string;
    }): Promise<SendMessageResult>;
    static getMessages(params: {
        conversationId: string;
        requestedBy: string;
        cursor?: string;
        limit?: number;
    }): Promise<{
        messages: import("../socket/socket.dto.js").ChatMessageSocketDto[];
        nextCursor: string | null;
        hasMore: boolean;
    }>;
    static getUnreadCount(params: {
        conversationId: string;
        userId: string;
    }): Promise<number>;
}
//# sourceMappingURL=chatmessage.service.d.ts.map