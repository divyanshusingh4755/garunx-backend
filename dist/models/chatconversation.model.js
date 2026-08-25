import { model, Schema } from "mongoose";
export var ChatConversationStatus;
(function (ChatConversationStatus) {
    ChatConversationStatus["ACTIVE"] = "ACTIVE";
    ChatConversationStatus["CLOSED"] = "CLOSED";
})(ChatConversationStatus || (ChatConversationStatus = {}));
const participantSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["USER", "COORDINATOR", "ADMIN"],
        required: true,
    },
    lastDeliveredMessageId: {
        type: Schema.Types.ObjectId,
        ref: "ChatMessage"
    },
    lastDeliveredAt: {
        type: Date
    },
    lastReadMessageId: {
        type: Schema.Types.ObjectId,
        ref: "ChatMessage"
    },
    lastReadAt: {
        type: Date,
    },
}, {
    _id: false,
});
const chatConversationSchema = new Schema({
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true,
        index: true,
    },
    participants: {
        type: [participantSchema],
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(ChatConversationStatus),
        default: ChatConversationStatus.ACTIVE,
    },
    lastMessageAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
chatConversationSchema.index({ "participants.userId": 1 });
export const ChatConversation = model("ChatConversation", chatConversationSchema);
//# sourceMappingURL=chatconversation.model.js.map