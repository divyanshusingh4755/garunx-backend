import { type Document, type Types } from "mongoose";
export declare enum ChatMessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    SYSTEM = "SYSTEM"
}
export interface IChatMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    type: ChatMessageType;
    text?: string;
    images: string[];
    clientMessageId: string;
    replyToMessageId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ChatMessage: import("mongoose").Model<IChatMessage, {}, {}, {}, Document<unknown, {}, IChatMessage, {}, import("mongoose").DefaultSchemaOptions> & IChatMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChatMessage>;
//# sourceMappingURL=chatmessage.model.d.ts.map