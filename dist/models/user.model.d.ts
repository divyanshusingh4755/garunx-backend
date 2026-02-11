import { Types, type Document } from 'mongoose';
import { Role } from '../types/rbac.js';
export interface IUser extends Document {
    firebaseUid?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role: Role;
    otp?: string | null;
    otpExpiresAt?: Date | null;
    isOtpVerified: boolean;
    isActive: boolean;
    fullName?: string;
    dob?: Date;
    gender?: 'Male' | 'Female' | 'Other';
    profileImage?: string;
    isComplete: boolean;
    referralCode?: string;
    referredBy?: Types.ObjectId;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map