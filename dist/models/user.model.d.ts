import { Types, type Document } from "mongoose";
import { Role } from "../types/rbac.js";
import { ApprovalStatus, AvailabilityStatus, Caste, Gender, Gotra, VerificationStatus } from "../types/enums.js";
export interface IRatingSummary {
    averageRating: number;
    totalRatings: number;
    ratingSum: number;
}
export interface IServiceableLocation {
    locationId: Types.ObjectId;
    caste?: Caste[];
    gotra?: Gotra[];
}
export interface ICoordinatorProfile {
    averageRating: number;
    totalRatings: number;
    ratingSum: number;
    totalCompletedBookings: number;
    totalAssignedBookings: number;
    acceptanceRate: number;
    approvalStatus: ApprovalStatus;
    approvalRejectionReason?: string | null;
    availabilityStatus: AvailabilityStatus;
    maxDailyBookings: number;
    autoAssignmentEnabled: boolean;
    lastAvailabilityChangedAt?: Date;
    serviceableLocations: IServiceableLocation[];
}
export interface IDocumentVerification {
    aadharCard?: string;
    panCard?: string;
    status: VerificationStatus;
    rejectionReason?: string | null;
}
export interface IBankDocumentVerification {
    bankPassbook?: string;
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    ifscCode?: string;
    status: VerificationStatus;
    rejectionReason?: string | null;
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
    profileImage?: string | null;
    isComplete: boolean;
    isResetVerified: boolean;
    referralCode?: string;
    referredBy?: Types.ObjectId | null;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    savedLocations: string[];
    documentVerification: IDocumentVerification;
    bankDocumentVerification: IBankDocumentVerification;
    caste?: Caste;
    gotra?: Gotra;
    isDocumentVerified: boolean;
    isBankDocumentVerified: boolean;
    userReference: string;
    ratingSummary?: IRatingSummary;
    coordinatorProfile?: ICoordinatorProfile;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map