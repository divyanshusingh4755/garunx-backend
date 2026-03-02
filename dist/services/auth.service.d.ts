import { type IUser } from "../models/user.model.js";
import type { Role } from "../types/rbac.js";
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
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
    static GetAllUsers(page?: number, limit?: number, role?: Role, isComplete?: boolean, isActive?: boolean, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
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
    static deactivateUser(userId: String, status: String): Promise<void>;
    static completeProfile(userId: string, fullName: string, dob?: Date, gender?: 'Male' | 'Female' | 'Other', referralCode?: string, password?: string, profileImage?: string, userAgent?: string, ip?: string, email?: string, phoneNumber?: string, caste?: 'SC' | 'ST' | 'OBC' | 'GENERAL', gotra?: 'Bharadvaja' | 'Kashyapa' | 'Vashistha' | 'Vishvamitra' | 'Gautama' | 'Atri' | 'Jamadagni' | 'Agastya'): Promise<{
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
        serviceableLocations?: {
            locationId: string | Types.ObjectId;
            caste?: string[];
            gotra?: string[];
        }[];
    }): Promise<(mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
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
    static updateVerificationStatus(userId: string, type: 'document' | 'bank', status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default AuthService;
//# sourceMappingURL=auth.service.d.ts.map