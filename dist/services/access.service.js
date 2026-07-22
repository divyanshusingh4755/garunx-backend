import { Types } from "mongoose";
import { User } from "../models/user.model.js";
export const resolveFamilyTreeOwnerId = async ({ actorId, actorRole, requestedOwnerId, }) => {
    /*
     * No ownerId in route means the authenticated
     * user is managing their own family tree.
     */
    if (!requestedOwnerId) {
        return actorId;
    }
    if (!Types.ObjectId.isValid(requestedOwnerId)) {
        throw new Error("Invalid family tree owner ID");
    }
    /*
     * A normal user cannot manage another
     * user's family tree.
     */
    if (actorRole !== "ADMIN" &&
        actorRole !== "COORDINATOR") {
        throw new Error("You are not authorized to manage this family tree");
    }
    const targetUser = await User.findById(requestedOwnerId)
        .select("_id")
        .lean();
    if (!targetUser) {
        throw new Error("Family tree owner not found");
    }
    if (actorRole === "COORDINATOR") {
        const assignedUser = await User.findOne({
            _id: requestedOwnerId,
            coordinatorId: actorId,
        })
            .select("_id")
            .lean();
        if (!assignedUser) {
            throw new Error("This user is not assigned to you");
        }
        return assignedUser._id.toString();
    }
    return targetUser._id.toString();
};
//# sourceMappingURL=access.service.js.map