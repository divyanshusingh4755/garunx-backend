import { Schema, Types, model, type Document } from 'mongoose';
import { Role } from '../types/rbac.js'

export interface IUser extends Document {
    // Auth & Identity
    firebaseUid?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role: Role;

    // Otp and Verification
    otp?: string | null;
    otpExpiresAt?: Date | null;
    isOtpVerified: boolean;
    isActive: boolean;

    // Profile Fields
    fullName?: string;
    dob?: Date;
    gender?: 'Male' | 'Female' | 'Other',
    profileImage?: string;
    isComplete: boolean;
    isResetVerified: boolean;

    // Referral System
    referralCode?: string;
    referredBy?: Types.ObjectId;

    // Security
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;

    // Location
    savedLocations?: string[];
    serviceableLocations?: Types.ObjectId[];

    // Document Verification
    documentVerification: {
        aadharCard?: string,
        panCard?: string,
        bankPassbook: string,
        status: 'PENDING' | 'APPROVED' | 'REJECTED',
        rejectionReason?: string;
    };
    isDocumentVerified: { type: Boolean, default: false }

}

const userSchema = new Schema<IUser>({
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    phoneNumber: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String },
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
    isResetVerified: { type: Boolean, default: false },
    referralCode: { type: String, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    savedLocations: [{ type: String }],
    serviceableLocations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    documentVerification: {
        aadharCard: { type: String },
        panCard: { type: String },
        bankPassbook: { type: String },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'

        },
        rejectionReason: { type: String }
    },
    isDocumentVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Allow same phone/email across DIFFERENT roles
userSchema.index(
    { email: 1, role: 1 },
    {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } }
    }
);

userSchema.index(
    { phoneNumber: 1, role: 1 },
    {
        unique: true,
        partialFilterExpression: { phoneNumber: { $type: "string" } }
    }
);
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

// Cleanup unverified users after 24 hours
userSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, partialFilterExpression: { isOtpVerified: false } }
);

export const User = model<IUser>('User', userSchema);