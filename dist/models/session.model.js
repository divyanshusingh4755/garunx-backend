import { model, Schema, Types } from "mongoose";
const sessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One user = One session
    },
    refreshToken: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    deviceInfo: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true }
});
// Auto delete the document when refresh token expires
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = model('Session', sessionSchema);
//# sourceMappingURL=session.model.js.map