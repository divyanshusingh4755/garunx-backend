import { Types, Document } from "mongoose";
import { FamilyRelation, MemberLifeStatus } from "../types/enums.js";
import { Caste, Gender, Gotra } from "../types/enums.js";
export interface IFamilyMember extends Document {
    ownerId: Types.ObjectId;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId | null;
    fullName: string;
    relation: FamilyRelation;
    gender?: Gender;
    dob?: Date;
    lifeStatus: MemberLifeStatus;
    dateOfDeath?: Date;
    fatherId?: Types.ObjectId | null;
    motherId?: Types.ObjectId | null;
    spouseIds: Types.ObjectId[];
    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: Caste;
    gotra?: Gotra;
    designatedPandit?: string;
    visitors?: string[];
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