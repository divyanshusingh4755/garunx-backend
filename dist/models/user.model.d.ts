import { Types, type Document } from 'mongoose';
import { Role } from '../types/rbac.js';
export interface IUser extends Document {
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
    isResetVerified: boolean;
    referralCode?: string;
    referredBy?: Types.ObjectId;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    savedLocations?: string[];
    serviceableLocations?: Types.ObjectId[];
    documentVerification: {
        aadharCard?: string;
        panCard?: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
    };
    bankDocumentVerification: {
        bankPassbook?: string;
        accountNumber?: string;
        accountName?: string;
        bankName?: string;
        ifscCode?: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
    };
    caste?: 'SC' | 'ST' | 'OBC' | 'GENERAL';
    gotra?: 'Bharadvaja' | 'Kashyapa' | 'Vashistha' | 'Vishvamitra' | 'Gautama' | 'Atri' | 'Jamadagni' | 'Agastya';
    isDocumentVerified: boolean;
    isBankDocumentVerified: boolean;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map