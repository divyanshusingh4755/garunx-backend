import { type Document, Types } from 'mongoose';
export interface IProfile extends Document {
    userId: Types.ObjectId;
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    dob?: Date;
    gender?: 'Male' | 'Female' | 'Other';
    referralCode?: string;
    isComplete: boolean;
    referredBy?: Types.ObjectId;
    profileImage?: string;
}
export declare const Profile: import("mongoose").Model<IProfile, {}, {}, {}, Document<unknown, {}, IProfile, {}, import("mongoose").DefaultSchemaOptions> & IProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProfile>;
//# sourceMappingURL=profile.model.d.ts.map