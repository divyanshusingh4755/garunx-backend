import { Types, Document } from "mongoose";
import { Role } from "../types/rbac.js";
import { ApprovalStatus, AvailabilityStatus, Caste, Gender, Gotra, VerificationStatus } from "../types/enums.js";
export interface ICoordinatorProfile {
    averageRating: number;
    totalRatings: number;
    ratingSum: number;
    totalCompletedBookings: number;
    totalAssignedBookings: number;
    acceptanceRate: number;
    approvalStatus: ApprovalStatus;
    availabilityStatus: AvailabilityStatus;
    maxDailyBookings: number;
    autoAssignmentEnabled: boolean;
    lastAvailabilityChangedAt?: Date;
    serviceableLocations?: {
        locationId: Types.ObjectId;
        caste?: Caste[];
        gotra?: Gotra[];
    }[];
}
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
    gender?: Gender;
    profileImage?: string;
    isComplete: boolean;
    isResetVerified: boolean;
    referralCode?: string;
    referredBy?: Types.ObjectId;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    savedLocations?: string[];
    documentVerification: {
        aadharCard?: string;
        panCard?: string;
        status: VerificationStatus;
        rejectionReason?: string;
    };
    bankDocumentVerification: {
        bankPassbook?: string;
        accountNumber?: string;
        accountName?: string;
        bankName?: string;
        ifscCode?: string;
        status: VerificationStatus;
        rejectionReason?: string;
    };
    caste?: Caste;
    gotra?: Gotra;
    isDocumentVerified: boolean;
    isBankDocumentVerified: boolean;
    userReference: string;
    coordinatorProfile?: ICoordinatorProfile;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map