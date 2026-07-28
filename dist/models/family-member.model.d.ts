import { Types, type Document } from "mongoose";
import { Caste, FamilyRelation, Gender, Gotra, MemberLifeStatus } from "../types/enums.js";
export type FamilyMemberSource = "CUSTOMER_SELF" | "COORDINATOR_BOOKING" | "ADMIN_MANUAL" | "SYSTEM_IMPORT";
export interface IFamilyMember extends Document {
    ownerId: Types.ObjectId;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId | null;
    source: FamilyMemberSource;
    sourceBookingId?: Types.ObjectId | null;
    sourceBookingReference?: string | null;
    isDeleted: boolean;
    deletedAt?: Date | null;
    deletedBy?: Types.ObjectId | null;
    deletionReason?: string | null;
    fullName: string;
    relation: FamilyRelation;
    gender?: Gender;
    dob?: Date;
    lifeStatus: MemberLifeStatus;
    dateOfDeath?: Date | null;
    fatherId?: Types.ObjectId | null;
    motherId?: Types.ObjectId | null;
    spouseIds: Types.ObjectId[];
    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: Caste;
    gotra?: Gotra;
    designatedPandit?: string;
    visitors: string[];
    profileImage?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FamilyMember: import("mongoose").Model<IFamilyMember, {}, {}, {}, Document<unknown, {}, IFamilyMember, {}, import("mongoose").DefaultSchemaOptions> & IFamilyMember & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFamilyMember>;
//# sourceMappingURL=family-member.model.d.ts.map