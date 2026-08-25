import { model, Schema } from "mongoose";
const contentSchema = new Schema({
    type: {
        type: String,
        enum: ["TERMS", "PRIVACY", "REFUND"],
        required: true,
        index: true,
    },
    userType: {
        type: String,
        enum: ["User", "Coordinator"],
        default: "User",
        required: true,
    },
    version: {
        type: Number,
        required: true,
        min: 1,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    publishedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
contentSchema.pre("validate", function () {
    if (this.isActive && !this.publishedAt) {
        this.publishedAt = new Date();
    }
});
contentSchema.index({ type: 1, userType: 1, version: 1 }, { unique: true, name: "UniquePolicyVersionPerAudience" });
contentSchema.index({ type: 1, userType: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true }, name: "UniqueActivePolicyPerAudience" });
contentSchema.index({ type: 1, userType: 1 });
contentSchema.index({ type: 1, userType: 1, publishedAt: -1 });
export const Content = model("Content", contentSchema);
//# sourceMappingURL=policy.model.js.map