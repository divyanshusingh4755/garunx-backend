import { Types } from "mongoose";
import { FamilyMember } from "../models/family-member.model.js";
import { User } from "../models/user.model.js";

export interface SharedFamilyTreeAccess {
    ownerId: string;
    linkedMemberId: string;
}

export async function resolveSharedFamilyTreeAccess(actorId: string): Promise<SharedFamilyTreeAccess> {
    if (!Types.ObjectId.isValid(actorId)) {
        throw new Error("Invalid authenticated user ID");
    }

    const actor = await User.findOne({
        _id: new Types.ObjectId(actorId),
        isActive: true,
        isOtpVerified: true,
    }).select("_id").lean();

    if (!actor) {
        throw new Error("Verified active account required");
    }

    const member = await FamilyMember.findOne({
        linkedUserId: actor._id,
        isDeleted: false,
    })
        .select("_id ownerId")
        .lean();

    if (!member) {
        throw new Error("No linked family member found");
    }

    return {
        ownerId: member.ownerId.toString(),
        linkedMemberId: member._id.toString(),
    };
}
