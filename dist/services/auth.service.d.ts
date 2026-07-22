import { type IUser } from "../models/user.model.js";
import { Role } from "../types/rbac.js";
import type { Types } from "mongoose";
import mongoose from "mongoose";
import { ApprovalStatus, AvailabilityStatus, VerificationStatus, type Caste, type Gender, type Gotra } from "../types/enums.js";
declare class AuthService {
    private static generateUserSession;
    static registerUser(role: Role, password?: string, userEmail?: string, phoneNumber?: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static socialAuth(role: Role, email: string, userAgent?: string, ip?: string): Promise<{
        isNewUser: boolean;
        user: IUser & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    static verifyOtp(userId: string, otp: string, email: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static resendOtp(userId: string, email: string): Promise<{
        success: boolean;
        message: string;
        otp: string;
    }>;
    static loginUser(identifier: string, role: Role, password?: string, userAgent?: string, ip?: string): Promise<{
        user: IUser;
        accessToken: string;
        refreshToken: string;
    }>;
    static refreshAccesToken(oldRefreshToken: string, userAgent: string, ip?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    static logoutUser(refreshToken: string, allDevices?: boolean): Promise<{
        success: boolean;
    }>;
    static forgotPassword(email: string, role: Role): Promise<{
        success: boolean;
        otp: string;
        message: string;
    }>;
    static resetPassword(userId: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static GetAllUsers(page?: number, limit?: number, role?: Role, isComplete?: boolean, isActive?: boolean, search?: string, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        users: (IUser & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    static GetUserById(userId: string): Promise<IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static GetUserByEmailOrPhone(identifier: string, role: Role): Promise<IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deactivateUser(userId: string, status: boolean): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static completeProfile(userId: string, fullName: string, dob?: Date, gender?: Gender, referralCode?: string, password?: string, profileImage?: string, userAgent?: string, ip?: string, email?: string, phoneNumber?: string, caste?: Caste, gotra?: Gotra): Promise<{
        user: IUser;
        accessToken: string;
        refreshToken: string;
    }>;
    static updateProfile(userId: string, updateData: {
        fullName?: string;
        dob?: Date;
        gender?: string;
        profileImage?: string;
        savedLocations?: string[];
    }): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static uploadVerificationDocuments(userId: string, docs: {
        aadharCard?: string;
        panCard?: string;
        bankPassbook?: string;
        accountNumber?: string;
        accountName?: string;
        bankName?: string;
        ifscCode?: string;
    }): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateVerificationStatus(userId: string, type: "document" | "bank", status: VerificationStatus.APPROVED | VerificationStatus.REJECTED, rejectionReason?: string): Promise<(IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static getCurrentUser(userId: string): Promise<IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateCoordinatorApproval(coordinatorId: string, status: ApprovalStatus, rejectionReason?: string): Promise<(IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static updateCoordinatorAvailability(coordinatorId: string, availabilityStatus: AvailabilityStatus): Promise<{
        availabilityStatus: AvailabilityStatus;
        lastAvailabilityChangedAt: Date;
    }>;
    static updateCoordinatorSettings(coordinatorId: string, settings: {
        maxDailyBookings?: number;
        autoAssignmentEnabled?: boolean;
    }): Promise<{
        maxDailyBookings: number;
        autoAssignmentEnabled: boolean;
    }>;
    static updateCoordinatorServiceableLocations(coordinatorId: string, serviceableLocations: {
        locationId: string | Types.ObjectId;
        caste?: Caste[];
        gotra?: Gotra[];
    }[]): Promise<(IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static getCoordinatorById(coordinatorId: string): Promise<IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getCoordinators(filters: {
        page?: number;
        limit?: number;
        approvalStatus?: ApprovalStatus;
        availabilityStatus?: AvailabilityStatus;
        locationId?: string;
        caste?: Caste;
        gotra?: Gotra;
        autoAssignmentEnabled?: boolean;
        minimumRating?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        coordinators: (IUser & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
}
export default AuthService;
//# sourceMappingURL=auth.service.d.ts.map