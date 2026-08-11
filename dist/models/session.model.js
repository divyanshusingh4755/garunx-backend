import { model, Schema, Types } from "mongoose";
const sessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
    familyId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    deviceInfo: {
        type: String,
        trim: true,
    },
    ipAddress: {
        type: String,
        trim: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});
// Auto-delete the session after its refresh token expires.
sessionSchema.index({
    expiresAt: 1,
}, {
    expireAfterSeconds: 0,
});
sessionSchema.index({
    userId: 1,
    familyId: 1,
});
export const Session = model("Session", sessionSchema);
//# sourceMappingURL=session.model.js.map