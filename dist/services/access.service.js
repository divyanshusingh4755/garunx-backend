import { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { Booking } from "../models/booking.model.js";
import { Role } from "../types/rbac.js";
export const resolveFamilyTreeOwnerId = async ({ actorId, actorRole, requestedOwnerId }) => {
    if (!Types.ObjectId.isValid(actorId)) {
        throw new Error("Invalid authenticated user ID");
    }
    const normalizedActorRole = actorRole?.trim().toUpperCase();
    if (!requestedOwnerId) {
        return { ownerId: actorId };
    }
    if (!Types.ObjectId.isValid(requestedOwnerId)) {
        throw new Error("Invalid family tree owner ID");
    }
    if (requestedOwnerId === actorId) {
        return { ownerId: actorId };
    }
    if (normalizedActorRole !== Role.ADMIN && normalizedActorRole !== Role.COORDINATOR) {
        throw new Error("You are not authorized to manage this family tree");
    }
    const targetUser = await User.findOne({ _id: new Types.ObjectId(requestedOwnerId), isActive: true }).select("_id").lean();
    if (!targetUser) {
        throw new Error("Family tree owner not found");
    }
    if (normalizedActorRole === Role.ADMIN) {
        return { ownerId: targetUser._id.toString() };
    }
    const activeBooking = await Booking.findOne({
        userId: new Types.ObjectId(requestedOwnerId),
        isDeleted: false,
        status: "IN_PROGRESS",
        "assignment.status": "ACCEPTED",
        "assignment.assignedCoordinatorId": new Types.ObjectId(actorId),
    }).select("_id bookingReference").sort({ scheduledAt: -1, createdAt: -1 }).lean();
    if (!activeBooking) {
        throw new Error("You are not authorized to manage this user's family tree");
    }
    return {
        ownerId: targetUser._id.toString(),
        bookingId: activeBooking._id.toString(),
        ...(activeBooking.bookingReference && { bookingReference: activeBooking.bookingReference }),
    };
};
//# sourceMappingURL=access.service.js.map