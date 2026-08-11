import { model, Schema } from "mongoose";
export var ChatMessageType;
(function (ChatMessageType) {
    ChatMessageType["TEXT"] = "TEXT";
    ChatMessageType["IMAGE"] = "IMAGE";
    ChatMessageType["SYSTEM"] = "SYSTEM";
})(ChatMessageType || (ChatMessageType = {}));
const chatMessageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "ChatConversation",
        required: true,
        index: true,
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: Object.values(ChatMessageType),
        required: true,
    },
    text: {
        type: String,
        trim: true,
        maxlength: 5000,
    },
    images: {
        type: [String],
        default: [],
    },
    clientMessageId: {
        type: String,
        required: true,
    },
    replyToMessageId: {
        type: Schema.Types.ObjectId,
        ref: "ChatMessage",
    },
}, {
    timestamps: true,
});
chatMessageSchema.index({
    conversationId: 1,
    createdAt: -1,
});
chatMessageSchema.index({
    conversationId: 1,
    senderId: 1,
    clientMessageId: 1,
}, {
    unique: true,
});
export const ChatMessage = model("ChatMessage", chatMessageSchema);
//# sourceMappingURL=chatmessage.model.js.map