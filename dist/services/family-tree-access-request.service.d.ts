import { Types } from "mongoose";
import mongoose from "mongoose";
export declare class FamilyTreeAccessRequestService {
    private static getVerifiedInvitationContacts;
    private static requireMember;
    static createInvitation(actorId: string, familyMemberId: string, recipient: {
        email?: string;
        phoneNumber?: string;
    }): Promise<{
        requestId: string;
        invitationToken: string;
        expiresAt: Date | null | undefined;
    }>;
    static getPendingInvitations(actorId: string): Promise<{
        _id: Types.ObjectId;
        treeOwnerId: Types.ObjectId;
        familyMemberId: Types.ObjectId | null;
        requesterId: Types.ObjectId | null;
        type: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestType;
        status: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestStatus;
        direction: string;
        familyMember: {
            _id: Types.ObjectId;
            fullName: string;
            relation: import("../types/enums.js").FamilyRelation;
        } | null;
        invitedEmail: string | null;
        invitedPhoneNumber: string | null;
        canAccept: boolean;
        expiresAt: Date | null | undefined;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    static requestToJoin(requesterId: string, treeOwnerId: string, familyMemberId: string): Promise<{
        requestId: string;
        status: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestStatus;
    }>;
    static getPendingRequests(actorId: string): Promise<{
        direction: string;
        canApprove: boolean;
        canReject: boolean;
        treeOwnerId: Types.ObjectId;
        familyMemberId?: Types.ObjectId | null;
        requesterId?: Types.ObjectId | null;
        type: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestType;
        status: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestStatus;
        invitationTokenHash?: string | null;
        invitationExpiresAt?: Date | null;
        createdBy: Types.ObjectId;
        decidedBy?: Types.ObjectId | null;
        invitedEmail?: string | null;
        invitedPhoneNumber?: string | null;
        decidedAt?: Date | null;
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
    }[]>;
    static decideJoinRequest(ownerId: string, requestId: string, decision: "APPROVED" | "REJECTED", confirmedFamilyMemberId?: string): Promise<{
        requestId: string;
        status: "APPROVED" | "REJECTED";
        familyMemberId: string | null;
        accessEnabled: boolean;
    }>;
    private static claimMember;
    static acceptInvitation(actorId: string, input: string | {
        invitationToken?: string;
        requestId?: string;
    }): Promise<{
        success: boolean;
        requestId: string;
        familyMemberId: string;
        linkedUserId: string;
        accessEnabled: boolean;
    }>;
    static activateApprovedJoinRequest(actorId: string, requestId: string): Promise<{
        success: boolean;
        familyMemberId: string;
        linkedUserId: string;
        accessEnabled: boolean;
    }>;
    static validateInvitation(invitationToken: string): Promise<{
        requestId: string;
        valid: boolean;
    }>;
    static requestToJoinDiscoveredTree(requesterId: string, discoveryToken: string): Promise<{
        requestId: string;
        status: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestStatus;
    }>;
}
//# sourceMappingURL=family-tree-access-request.service.d.ts.map