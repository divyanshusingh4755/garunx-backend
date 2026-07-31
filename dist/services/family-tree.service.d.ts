import mongoose, { Types } from "mongoose";
import { type IFamilyMember } from "../models/family-member.model.js";
import { type FamilyTreeActivitySource } from "../models/family-tree-activity.model.js";
import { FamilyEdgeType, FamilyRelation, Gender, MemberLifeStatus } from "../types/enums.js";
export interface GetFamilyTreeActivitiesQuery {
    action?: string;
    familyMemberId?: string;
    performedBy?: string;
    bookingId?: string;
    page?: number;
    limit?: number;
}
export interface GetFamilyMemberActivitiesQuery {
    page?: number;
    limit?: number;
}
export interface GetFamilyMembersQuery {
    search?: string;
    relation?: FamilyRelation;
    gender?: Gender;
    lifeStatus?: MemberLifeStatus;
    page?: number;
    limit?: number;
}
export interface FamilyTreeActorContext {
    ownerId: string;
    actorId: string;
    actorRole: string;
    source: FamilyTreeActivitySource;
    bookingId?: string;
    bookingReference?: string;
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
    private static validateContext;
    private static getUniqueIds;
    private static escapeRegex;
    private static normalizeAuditValue;
    private static valuesAreEqual;
    private static buildChanges;
    private static createActivity;
    private static verifyFamilyMemberIds;
    private static validateParentRelationships;
    private static validateLifeStatus;
    private static populateMember;
    static addFamilyMember(context: FamilyTreeActorContext, payload: AddFamilyMemberPayload): Promise<(IFamilyMember & Required<{
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
                dateOfDeath: Date | null | undefined;
                fatherId: string | null;
                motherId: string | null;
                spouseIds: string[];
                nativeVillage: string | undefined;
                state: string | undefined;
                district: string | undefined;
                caste: import("../types/enums.js").Caste | undefined;
                gotra: import("../types/enums.js").Gotra | undefined;
                designatedPandit: string | undefined;
                visitors: string[];
                profileImage: string | null | undefined;
                notes: string | undefined;
                audit: {
                    createdAt: Date;
                    createdBy: Types.ObjectId;
                    updatedAt: Date;
                    updatedBy: Types.ObjectId | null | undefined;
                    source: import("../models/family-member.model.js").FamilyMemberSource;
                    bookingId: Types.ObjectId | null | undefined;
                    bookingReference: string | null | undefined;
                };
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
        audit: {
            createdAt: Date;
            createdBy: Types.ObjectId;
            updatedAt: Date;
            updatedBy: Types.ObjectId | null | undefined;
            source: import("../models/family-member.model.js").FamilyMemberSource;
            bookingId: Types.ObjectId | null | undefined;
            bookingReference: string | null | undefined;
        };
        ownerId: Types.ObjectId;
        createdBy: Types.ObjectId;
        updatedBy?: Types.ObjectId | null;
        source: import("../models/family-member.model.js").FamilyMemberSource;
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
        caste?: import("../types/enums.js").Caste;
        gotra?: import("../types/enums.js").Gotra;
        designatedPandit?: string;
        visitors: string[];
        profileImage?: string | null;
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
    static updateFamilyMember(context: FamilyTreeActorContext, familyMemberId: string, payload: UpdateFamilyMemberPayload): Promise<(IFamilyMember & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    static deleteFamilyMember(context: FamilyTreeActorContext, familyMemberId: string, reason: string): Promise<{
        id: Types.ObjectId;
        fullName: string;
        deletedAt: Date;
        deletedBy: Types.ObjectId;
        reason: string;
    }>;
    static getFamilyTreeActivities(ownerId: string, query: GetFamilyTreeActivitiesQuery): Promise<{
        activities: (import("../models/family-tree-activity.model.js").IFamilyTreeActivity & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalActivities: number;
            limit: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    static getFamilyMemberActivities(ownerId: string, familyMemberId: string, query: GetFamilyMemberActivitiesQuery): Promise<{
        familyMember: IFamilyMember & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        activities: (import("../models/family-tree-activity.model.js").IFamilyTreeActivity & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalActivities: number;
            limit: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    static restoreFamilyMember(context: FamilyTreeActorContext, familyMemberId: string, reason?: string): Promise<never>;
}
export default FamilyTreeService;
//# sourceMappingURL=family-tree.service.d.ts.map