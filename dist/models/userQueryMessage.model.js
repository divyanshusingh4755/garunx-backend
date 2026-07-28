import { Schema, Types, model, Document, Model, } from "mongoose";
const userQueryMessageSchema = new Schema({
    queryId: {
        type: Schema.Types.ObjectId,
        ref: "UserQuery",
        required: true,
        index: true,
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    senderType: {
        type: String,
        enum: [
            "CUSTOMER",
            "COORDINATOR",
            "ADMIN",
        ],
        required: true,
        index: true,
    },
    message: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    imageUrls: {
        type: [
            {
                type: String,
                trim: true,
                maxlength: 2000,
            },
        ],
        default: [],
    },
}, {
    timestamps: true,
});
// At least message or image is required
userQueryMessageSchema.pre("validate", function () {
    const hasMessage = typeof this.message === "string" &&
        this.message.trim().length > 0;
    const hasImages = Array.isArray(this.imageUrls) &&
        this.imageUrls.length > 0;
    if (!hasMessage &&
        !hasImages) {
        throw new Error("Message or at least one image is required");
    }
});
// Conversation listing
userQueryMessageSchema.index({
    queryId: 1,
    createdAt: 1,
});
export const UserQueryMessage = model("UserQueryMessage", userQueryMessageSchema);
//# sourceMappingURL=userQueryMessage.model.js.map