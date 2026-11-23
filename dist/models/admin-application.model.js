import { Schema, model } from "mongoose";
const adminApplicationSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
        required: true,
    },
    decidedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    decidedAt: Date,
    adminId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });
adminApplicationSchema.index({ email: 1 }, {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
});
adminApplicationSchema.index({ status: 1, createdAt: -1 });
export const AdminApplication = model("AdminApplication", adminApplicationSchema);
//# sourceMappingURL=admin-application.model.js.map