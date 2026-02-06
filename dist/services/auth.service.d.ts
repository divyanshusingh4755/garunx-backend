import { type IUser } from "../models/user.model.js";
import type { Role } from "../types/rbac.js";
import mongoose from 'mongoose';
declare class AuthService {
    static registerUser(role: Role, idToken: string, password?: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static verifyOtp(phoneNumber: string, otp: string): Promise<void>;
    static resendOtp(phoneNumber: string): Promise<boolean>;
    static loginUser(identifier: string, userAgent?: string, password?: string, idToken?: string, ip?: string): Promise<{
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
        sucess?: never;
    } | {
        sucess: boolean;
        success?: never;
    }>;
    static forgotPassword(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static GetAllUser(page?: number, limit?: number): Promise<{
        users: (mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        pagination: {
            total: number;
            page: number;
            pages: number;
        };
    }>;
    static GetUserById(userId: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static GetUserByEmailorPhone(identifier: string): Promise<mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deactivateUser(userId: String): Promise<void>;
}
export default AuthService;
//# sourceMappingURL=auth.service.d.ts.map