import { Schema, Types, model, } from "mongoose";
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
            "USER",
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
        validate: {
            validator: (value) => Array.isArray(value) &&
                value.length <= 5,
            message: "A maximum of 5 images is allowed",
        },
    },
}, {
    timestamps: true,
});
userQueryMessageSchema.pre("validate", function () {
    const hasMessage = typeof this.message === "string" &&
        this.message.trim().length > 0;
    const hasImages = Array.isArray(this.imageUrls) &&
        this.imageUrls.length > 0;
    if (!hasMessage && !hasImages) {
        throw new Error("Message or at least one image is required");
    }
});
userQueryMessageSchema.index({
    queryId: 1,
    createdAt: 1,
});
export const UserQueryMessage = model("UserQueryMessage", userQueryMessageSchema);
//# sourceMappingURL=userQueryMessage.model.js.map