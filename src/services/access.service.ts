import { Types } from "mongoose";

import { User } from "../models/user.model.js";
import { Booking } from "../models/booking.model.js";
import { Role } from "../types/rbac.js";

interface ResolveTreeOwnerParams {
    actorId: string;
    actorRole?: string;
    requestedOwnerId?: string;
}

export const resolveFamilyTreeOwnerId = async ({
    actorId,
    actorRole,
    requestedOwnerId,
}: ResolveTreeOwnerParams): Promise<string> => {
    /*
     * No ownerId means authenticated user
     * is accessing their own family tree.
     */
    if (!requestedOwnerId) {
        return actorId;
    }

    if (!Types.ObjectId.isValid(requestedOwnerId)) {
        throw new Error(
            "Invalid family tree owner ID",
        );
    }

    if (!Types.ObjectId.isValid(actorId)) {
        throw new Error(
            "Invalid authenticated user ID",
        );
    }

    /*
     * Normal users cannot access another
     * user's family tree.
     */
    if (
        actorRole !== Role.ADMIN &&
        actorRole !== Role.COORDINATOR
    ) {
        throw new Error(
            "You are not authorized to manage this family tree",
        );
    }

    /*
     * Verify that requested owner exists.
     */
    const targetUser = await User.findById(
        requestedOwnerId,
    )
        .select("_id")
        .lean();

    if (!targetUser) {
        throw new Error(
            "Family tree owner not found",
        );
    }

    /*
     * Admin can access any user's tree.
     */
    if (actorRole === Role.ADMIN) {
        return targetUser._id.toString();
    }

    /*
     * Coordinator can access only a customer
     * whose active booking is assigned to them.
     */
    if (actorRole === Role.COORDINATOR) {
        const activeBooking = await Booking.findOne({
            userId: new Types.ObjectId(
                requestedOwnerId,
            ),

            isDeleted: false,

            status: "IN_PROGRESS",

            "assignment.status": "ACCEPTED",

            "assignment.assignedCoordinatorId":
                new Types.ObjectId(actorId),
        })
            .select("_id")
            .lean();

        if (!activeBooking) {
            throw new Error(
                "You are not authorized to manage this user's family tree",
            );
        }

        return targetUser._id.toString();
    }

    throw new Error(
        "You are not authorized to manage this family tree",
    );
};