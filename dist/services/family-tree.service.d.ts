import mongoose, { Types } from "mongoose";
import { type IFamilyMember } from "../models/family-member.model.js";
import { FamilyEdgeType, FamilyRelation, Gender, MemberLifeStatus } from "../types/enums.js";
export interface GetFamilyMembersQuery {
    search?: string;
    relation?: FamilyRelation;
    gender?: Gender;
    lifeStatus?: MemberLifeStatus;
    page?: number;
    limit?: number;
}
interface AddFamilyMemberPayload {
    fullName: string;
    relation: FamilyRelation;
    gender?: Gender;
    dob?: Date;
    lifeStatus?: MemberLifeStatus;
    dateOfDeath?: Date;
    fatherId?: string | null;
    motherId?: string | null;
    spouseIds?: string[];
    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: string;
    gotra?: string;
    designatedPandit?: string;
    visitors?: string[];
    profileImage?: string;
    notes?: string;
}
interface UpdateFamilyMemberPayload {
    fullName?: string;
    relation?: FamilyRelation;
    gender?: Gender;
    dob?: Date | null;
    lifeStatus?: MemberLifeStatus;
    dateOfDeath?: Date | null;
    fatherId?: string | null;
    motherId?: string | null;
    spouseIds?: string[];
    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: string | null;
    gotra?: string | null;
    designatedPandit?: string;
    visitors?: string[];
    profileImage?: string;
    notes?: string;
}
interface FamilyTreeEdge {
    id: string;
    source: string;
    target: string;
    relationType: FamilyEdgeType;
    parentType?: "FATHER" | "MOTHER";
    sourceRelation?: FamilyRelation;
    targetRelation?: FamilyRelation;
    label?: string;
}
declare class FamilyTreeService {
    private static getUniqueIds;
    private static escapeRegex;
    private static verifyFamilyMemberIds;
    private static validateParentRelationships;
    private static validateLifeStatus;
    private static validateObjectId;
    static addFamilyMember(ownerId: string, actorId: string, payload: AddFamilyMemberPayload): Promise<(IFamilyMember & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static getFamilyTree(ownerId: string): Promise<{
        nodes: {
            id: string;
            data: {
                fullName: string;
                relation: FamilyRelation;
                gender: Gender | undefined;
                dob: Date | undefined;
                lifeStatus: MemberLifeStatus;
                dateOfDeath: Date | undefined;
                fatherId: string | null;
                motherId: string | null;
                spouseIds: string[];
                nativeVillage: string | undefined;
                state: string | undefined;
                district: string | undefined;
                caste: import("../types/enums.js").Caste | undefined;
                gotra: import("../types/enums.js").Gotra | undefined;
                designatedPandit: string | undefined;
                visitors: string[] | undefined;
                profileImage: string | undefined;
                notes: string | undefined;
            };
        }[];
        edges: FamilyTreeEdge[];
        rootMembers: {
            id: string;
            fullName: string;
            relation: FamilyRelation;
        }[];
        totalMembers: number;
    }>;
    static getFamilyMembers(ownerId: string, query: GetFamilyMembersQuery): Promise<{
        familyMembers: (IFamilyMember & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalMembers: number;
            limit: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    static getFamilyMemberById(ownerId: string, familyMemberId: string): Promise<{
        children: (IFamilyMember & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
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
        caste?: import("../types/enums.js").Caste;
        gotra?: import("../types/enums.js").Gotra;
        designatedPandit?: string;
        visitors?: string[];
        profileImage?: string;
        notes?: string;
        createdAt: Date;
        updatedAt: Date;
        _id: Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }>;
    static updateFamilyMember(ownerId: string, actorId: string, familyMemberId: string, payload: UpdateFamilyMemberPayload): Promise<(IFamilyMember & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static deleteFamilyMember(ownerId: string, familyMemberId: string): Promise<{
        id: Types.ObjectId;
        fullName: string;
    }>;
}
export default FamilyTreeService;
//# sourceMappingURL=family-tree.service.d.ts.map