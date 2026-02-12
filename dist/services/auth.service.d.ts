import { type IUser } from "../models/user.model.js";
import type { Role } from "../types/rbac.js";
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
declare class AuthService {
    static registerUser(role: Role, idToken?: string, password?: string, userEmail?: string, phoneNumber?: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static verifyOtp(userId: string, otp: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static resendOtp(userId: string): Promise<{
        message: string;
    }>;
    static loginUser(identifier: string, role: Role, password?: string, idToken?: string, userAgent?: string, ip?: string): Promise<{
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
        message: string;
    }>;
    static resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static GetAllUsers(page?: number, limit?: number, role?: Role, isComplete?: boolean): Promise<{
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
    static deactivateUser(userId: String): Promise<void>;
    static completeProfile(userId: string, fullName: string, dob?: Date, gender?: 'Male' | 'Female' | 'Other', referralCode?: string, password?: string, profileImage?: string, userAgent?: string, ip?: string): Promise<{
        user: IUser;
        accessToken: string;
        refreshToken: string;
    }>;
    static updateProfile(userId: string, updateData: {
        fullName?: string;
        dob?: Date;
        gender?: string;
        profileImage?: string;
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
    }): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateVerificationStatus(userId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default AuthService;
//# sourceMappingURL=auth.service.d.ts.map