import { Schema, model, type Document } from 'mongoose';
import { Role } from '../types/rbac.js'

export interface IUser extends Document {
    firebaseUid?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role: Role;
    isActive: boolean;
    isVerified: boolean;
    isDocumentVerified: boolean;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    otp?: string | null;
}

const userSchema = new Schema<IUser>({
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    phoneNumber: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    password: { type: String, select: false },
    role: {
        type: String,
        enum: Object.values(Role),
        required: true,
        default: Role.USER
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isDocumentVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

// TTL Index for cleanup (Deletes unverified users after 24 hours)
userSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 86400,
        partialFilterExpression: { isVerified: false }
    }
);

export const User = model<IUser>('User', userSchema);