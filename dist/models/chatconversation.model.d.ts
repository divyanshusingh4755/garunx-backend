import { type Document, type Types } from "mongoose";
export declare enum ChatConversationStatus {
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED"
}
export interface IChatParticipant {
    userId: Types.ObjectId;
    role: "USER" | "COORDINATOR" | "ADMIN";
    lastDeliveredMessageId?: Types.ObjectId;
    lastDeliveredAt?: Date;
    lastReadMessageId?: Types.ObjectId;
    lastReadAt?: Date;
}
export interface IChatConversation extends Document {
    bookingId: Types.ObjectId;
    participants: IChatParticipant[];
    status: ChatConversationStatus;
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ChatConversation: import("mongoose").Model<IChatConversation, {}, {}, {}, Document<unknown, {}, IChatConversation, {}, import("mongoose").DefaultSchemaOptions> & IChatConversation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChatConversation>;
//# sourceMappingURL=chatconversation.model.d.ts.map