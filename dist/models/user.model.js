import { Schema, Types, model } from 'mongoose';
import { Role } from '../types/rbac.js';
const userSchema = new Schema({
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    phoneNumber: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: {
        type: String,
        enum: Object.values(Role),
        required: true,
        default: Role.USER
    },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    isOtpVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    fullName: { type: String, lowercase: true, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    profileImage: { type: String, default: null },
    isComplete: { type: Boolean, default: false },
    referralCode: { type: String, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });
// Allow same phone/email across DIFFERENT roles
userSchema.index({ email: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } }
});
userSchema.index({ phoneNumber: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: "string" } }
});
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
// Cleanup unverified users after 24 hours
userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { isOtpVerified: false } });
export const User = model('User', userSchema);
//# sourceMappingURL=user.model.js.map