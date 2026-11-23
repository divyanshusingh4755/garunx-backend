import { type ClientSession } from "mongoose";
import { type IFamilyMember } from "../models/family-member.model.js";
import type { FamilyTreeActorContext } from "./family-tree.service.js";
export declare class FamilyTreeMemberAccessService {
    private static isPrivilegedContext;
    static getLinkedMember(context: FamilyTreeActorContext, session: ClientSession): Promise<IFamilyMember>;
    static assertCanEditMember(context: FamilyTreeActorContext, target: IFamilyMember, session: ClientSession): Promise<void>;
    static assertCanAddRelative(context: FamilyTreeActorContext, relatedToMemberId: string, relationship: string, session: ClientSession): Promise<void>;
    static assertCanDeleteBranchMember(actorId: string, ownerId: string, target: IFamilyMember, session: ClientSession): Promise<void>;
    static assertOwnerOnly(context: FamilyTreeActorContext): Promise<void>;
}
//# sourceMappingURL=family-tree-member-access.service.d.ts.map