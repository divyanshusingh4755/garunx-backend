import { Types, type ClientSession } from "mongoose";
import { FamilyMember, type IFamilyMember } from "../models/family-member.model.js";

import type {
    FamilyTreeActorContext,
} from "./family-tree.service.js";

export class FamilyTreeMemberAccessService {
    private static isPrivilegedContext(context: FamilyTreeActorContext): boolean {
        const role = context.actorRole.trim().toUpperCase();
        return ((role === "ADMIN" && context.source === "ADMIN_MANUAL") || (role === "COORDINATOR" && context.source === "COORDINATOR_BOOKING"));
    }

    static async getLinkedMember(context: FamilyTreeActorContext, session: ClientSession): Promise<IFamilyMember> {
        const member = await FamilyMember.findOne({
            ownerId: new Types.ObjectId(context.ownerId),
            linkedUserId: new Types.ObjectId(context.actorId),
            isDeleted: false,
        }).session(session);

        if (!member) {
            throw new Error("Your account is not linked to this family tree");
        }

        return member;
    }

    static async assertCanEditMember(context: FamilyTreeActorContext, target: IFamilyMember, session: ClientSession): Promise<void> {
        // Existing owner authorization.
        if (context.actorId === context.ownerId) {
            return;
        }

        // These contexts must already have passed the existing Admin/Coordinator authorization resolver.
        if (this.isPrivilegedContext(context)) {
            return;
        }

        if (context.source !== "CUSTOMER_SELF") {
            throw new Error("Unauthorized family tree operation");
        }

        const self = await this.getLinkedMember(context, session);

        if (target.isDeleted || target.ownerId.toString() !== context.ownerId) {
            throw new Error("Family member not found");
        }

        // Own linked record.
        if (self._id.equals(target._id)) {
            return;
        }

        // Never allow a joined user to edit another registered person's claimed record.
        if (target.linkedUserId) {
            throw new Error("You cannot edit another user's linked member");
        }

        // Existing spouse directly connected to SELF.
        const isSpouse = self.spouseIds.some((id) => id.equals(target._id)) && target.spouseIds.some((id) => id.equals(self._id));

        if (isSpouse) {
            return;
        }

        // Existing biological child directly connected to SELF through a parent relationship.
        const isChild = Boolean(target.fatherId?.equals(self._id)) || Boolean(target.motherId?.equals(self._id));

        if (isChild) {
            return;
        }

        throw new Error("You can only edit your own member, spouse, or children");
    }

    static async assertCanAddRelative(context: FamilyTreeActorContext, relatedToMemberId: string, relationship: string, session: ClientSession): Promise<void> {
        if (context.actorId === context.ownerId) {
            return;
        }

        if (this.isPrivilegedContext(context)) {
            return;
        }

        if (context.source !== "CUSTOMER_SELF") {
            throw new Error("Unauthorized family tree operation");
        }

        const self = await this.getLinkedMember(context, session);

        if (self._id.toString() !== relatedToMemberId) {
            throw new Error("New relatives must be linked to your own member");
        }

        if (!["HUSBAND", "WIFE", "SON", "DAUGHTER"].includes(relationship)) {
            throw new Error("You cannot add shared ancestors or other branches");
        }
    }

    static async assertCanDeleteBranchMember(actorId: string, ownerId: string, target: IFamilyMember, session: ClientSession): Promise<void> {
        const self = await FamilyMember.findOne({
            ownerId: new Types.ObjectId(ownerId),
            linkedUserId: new Types.ObjectId(actorId),
            isDeleted: false,
        }).session(session);

        if (!self) {
            throw new Error("Not authorized to access this family tree");
        }

        if (!target.ownerId.equals(self.ownerId) || target.isDeleted || target._id.equals(self._id) || target.linkedUserId) {
            throw new Error("Not authorized to delete this member");
        }

        const isOwnChild = Boolean(target.fatherId?.equals(self._id)) || Boolean(target.motherId?.equals(self._id));
        if (!isOwnChild) {
            throw new Error("Not authorized to delete this member");
        }

        const hasDescendants = await FamilyMember.exists({
            ownerId: self.ownerId,
            isDeleted: false,
            $or: [
                { fatherId: target._id },
                { motherId: target._id },
            ],
        }).session(session);

        if (hasDescendants) {
            throw new Error("Cannot delete a child with surviving descendants");
        }

        const hasSpouseLinks = target.spouseIds.length > 0 ||
            Boolean(
                await FamilyMember.exists({
                    ownerId: self.ownerId,
                    isDeleted: false,
                    spouseIds: target._id,
                }).session(session),
            );

        if (hasSpouseLinks) {
            throw new Error("Cannot delete a child with spouse relationships");
        }
    }

    static async assertOwnerOnly(context: FamilyTreeActorContext): Promise<void> {
        if (!Types.ObjectId.isValid(context.actorId) || !Types.ObjectId.isValid(context.ownerId)) {
            throw new Error("Invalid family tree access");
        }

        // Original family-tree owner.
        if (context.actorId === context.ownerId) {
            return;
        }

        // Admin / Coordinator permissions must already have been verified by the existing access resolver.
        if (this.isPrivilegedContext(context)) {
            return;
        }

        throw new Error("Not authorized to perform this operation");
    }
}
