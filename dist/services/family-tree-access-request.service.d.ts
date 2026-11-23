import { Types } from "mongoose";
export declare class FamilyTreeAccessRequestService {
    private static requireMember;
    static createInvitation(actorId: string, familyMemberId: string, recipient: {
        email?: string;
        phoneNumber?: string;
    }): Promise<{
        requestId: string;
        invitationToken: string;
        expiresAt: Date | null | undefined;
    }>;
    static requestToJoin(requesterId: string, treeOwnerId: string, familyMemberId: string): Promise<{
        requestId: string;
        status: import("../models/family-tree-access-request.model.js").FamilyTreeAccessRequestStatus;
    }>;
    static getPendingRequests(treeOwnerId: string): Promise<(import("../models/family-tree-access-request.model.js").IFamilyTreeAccessRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static decideJoinRequest(ownerId: string, requestId: string, decision: "APPROVED" | "REJECTED", confirmedFamilyMemberId?: string): Promise<{
        requestId: string;
        status: "APPROVED" | "REJECTED";
        familyMemberId: string | null;
        accessEnabled: boolean;
    }>;
    private static claimMember;
    static acceptInvitation(actorId: string, invitationToken: string): Promise<{
        success: boolean;
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