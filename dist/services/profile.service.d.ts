import type { Types } from "mongoose";
import mongoose from "mongoose";
declare class ProfileService {
    static completeProfile(userId: Types.ObjectId | string, fullName: string, phoneNumber?: string, email?: string, dob?: Date, gender?: 'Male' | 'Female' | 'Other', referralCode?: string): Promise<mongoose.Document<unknown, {}, import("../models/profile.model.js").IProfile, {}, mongoose.DefaultSchemaOptions> & import("../models/profile.model.js").IProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getGetAllProfile(page?: number, limit?: number): Promise<{
        profiles: (mongoose.Document<unknown, {}, import("../models/profile.model.js").IProfile, {}, mongoose.DefaultSchemaOptions> & import("../models/profile.model.js").IProfile & Required<{
            _id: Types.ObjectId;
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
    static getProfileById(profileId: string): Promise<mongoose.Document<unknown, {}, import("../models/profile.model.js").IProfile, {}, mongoose.DefaultSchemaOptions> & import("../models/profile.model.js").IProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getProfileByEmailorPhone(identifier: string): Promise<mongoose.Document<unknown, {}, import("../models/profile.model.js").IProfile, {}, mongoose.DefaultSchemaOptions> & import("../models/profile.model.js").IProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deleteProfile(profileId: string): Promise<{
        success: boolean;
    }>;
}
export default ProfileService;
//# sourceMappingURL=profile.service.d.ts.map