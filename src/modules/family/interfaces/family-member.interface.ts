import { Document, Types } from "mongoose";
import type { Gender } from "../enums/gender.enum.js";
import type { MemberRole } from "../enums/member-role.enum.js";
import type { MemberStatus } from "../enums/member-status.enum.js";

export interface IAddress {
    line1?: string;
    line2?: string;
    village?: string;
    city?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    country?: string;
    pincode?: string;
}

export interface IFamilyMember extends Document {
    familyId: Types.ObjectId;
    userId?: Types.ObjectId;
    firstName: string;
    middleName?: string;
    lastName?: string;
    gender: Gender;
    dateOfBirth?: Date;
    isLiving: boolean;
    phone?: string;
    email?: string;
    profilePhoto?: string;
    occupation?: string;
    education?: string;
    bloodGroup?: string;
    bio?: string;
    address?: IAddress;
    role: MemberRole;
    status: MemberStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}