import { model, Schema, } from "mongoose";
export var ChatMessageType;
(function (ChatMessageType) {
    ChatMessageType["TEXT"] = "TEXT";
    ChatMessageType["IMAGE"] = "IMAGE";
    ChatMessageType["SYSTEM"] = "SYSTEM";
})(ChatMessageType || (ChatMessageType = {}));
const isHttpUrl = (value) => {
    try {
        const parsed = new URL(value);
        return (parsed.protocol === "http:" || parsed.protocol === "https:");
    }
    catch {
        return false;
    }
};
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
        type: [
            {
                type: String,
                trim: true,
                maxlength: 2000,
                validate: {
                    validator: isHttpUrl,
                    message: "Each image must be a valid HTTP or HTTPS URL",
                },
            },
        ],
        default: [],
        validate: {
            validator: (value) => Array.isArray(value) && value.length <= 5,
            message: "Maximum 5 images are allowed per message",
        },
    },
    clientMessageId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128,
    },
    replyToMessageId: {
        type: Schema.Types.ObjectId,
        ref: "ChatMessage",
    },
}, {
    timestamps: true,
});
chatMessageSchema.pre("validate", function () {
    const normalizedText = this.text?.trim();
    const images = this.images ?? [];
    if (this.type === ChatMessageType.TEXT) {
        if (!normalizedText) {
            throw new Error("Text is required for TEXT message");
        }
        if (images.length > 0) {
            throw new Error("Text message cannot contain images");
        }
    }
    if (this.type === ChatMessageType.IMAGE && images.length === 0) {
        throw new Error("At least one image is required for IMAGE message");
    }
    if (!this.clientMessageId?.trim()) {
        throw new Error("Client message ID is required");
    }
});
chatMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
chatMessageSchema.index({ conversationId: 1, senderId: 1, clientMessageId: 1 }, { unique: true, });
export const ChatMessage = model("ChatMessage", chatMessageSchema);
//# sourceMappingURL=chatmessage.model.js.map