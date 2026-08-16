import mongoose, { Types } from "mongoose";
export declare class ChatConversationService {
    private static isMessageAtOrBefore;
    static createForBooking(params: {
        bookingId: string;
        userId: string;
        coordinatorId: string;
    }): Promise<mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getByBookingId(params: {
        bookingId: string;
        requestedBy: string;
    }): Promise<mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getById(params: {
        conversationId: string;
        requestedBy: string;
    }): Promise<mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static assertParticipant(params: {
        conversationId: string;
        userId: string;
        requireActive?: boolean;
    }): Promise<mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static markAsRead(params: {
        conversationId: string;
        userId: string;
        messageId: string;
    }): Promise<{
        conversationId: string;
        userId: string;
        messageId: string;
        readAt: Date;
    }>;
    static closeConversation(params: {
        conversationId: string;
    }): Promise<mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static closeForBooking(params: {
        bookingId: string;
    }): Promise<(mongoose.Document<unknown, {}, import("../models/chatconversation.model.js").IChatConversation, {}, mongoose.DefaultSchemaOptions> & import("../models/chatconversation.model.js").IChatConversation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getParticipantUserIds(params: {
        userId: string;
    }): Promise<string[]>;
    static markAsDelivered(params: {
        conversationId: string;
        userId: string;
        messageId: string;
    }): Promise<{
        conversationId: string;
        userId: string;
        messageId: string;
        deliveredAt: Date;
    }>;
}
//# sourceMappingURL=chatconversation.service.d.ts.map