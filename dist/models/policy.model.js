import { Document, model, Schema } from "mongoose";
const contentSchema = new Schema({
    type: {
        type: String,
        enum: ["TERMS", "PRIVACY", "REFUND"],
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    userType: { type: String, enum: ["User", "Coordinator"], default: "User" },
    version: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    publishedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
contentSchema.index({
    type: 1,
    userType: 1,
    isActive: 1,
}, {
    unique: true,
    partialFilterExpression: {
        isActive: true,
    },
});
contentSchema.index({
    type: 1,
    userType: 1,
    version: -1,
});
contentSchema.index({
    type: 1,
    userType: 1,
    publishedAt: -1,
});
export const Content = model("Content", contentSchema);
//# sourceMappingURL=policy.model.js.map