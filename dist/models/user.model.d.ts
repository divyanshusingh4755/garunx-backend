import { type Document } from 'mongoose';
import { Role } from '../types/rbac.js';
export interface IUser extends Document {
    firebaseUid?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role: Role;
    isActive: boolean;
    isVerified: boolean;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    otp?: string | null;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map