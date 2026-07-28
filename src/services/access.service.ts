import { Types } from "mongoose";

import { User } from "../models/user.model.js";
import { Booking } from "../models/booking.model.js";
import { Role } from "../types/rbac.js";

interface ResolveTreeOwnerParams {
    actorId: string;
    actorRole?: string;
    requestedOwnerId?: string;
}

export interface ResolvedFamilyTreeAccess {
    ownerId: string;
    bookingId?: string;
    bookingReference?: string;
}

export const resolveFamilyTreeOwnerId = async ({
    actorId,
    actorRole,
    requestedOwnerId,
}: ResolveTreeOwnerParams): Promise<ResolvedFamilyTreeAccess> => {
    if (!Types.ObjectId.isValid(actorId)) {
        throw new Error(
            "Invalid authenticated user ID",
        );
    }

    /*
     * No ownerId means the authenticated user
     * is accessing their own family tree.
     */
    if (!requestedOwnerId) {
        return {
            ownerId: actorId,
        };
    }

    if (!Types.ObjectId.isValid(requestedOwnerId)) {
        throw new Error(
            "Invalid family tree owner ID",
        );
    }

    /*
     * When the requested owner is the same as
     * the authenticated user, treat it as
     * self-access regardless of role.
     */
    if (requestedOwnerId === actorId) {
        return {
            ownerId: actorId,
        };
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
     * Verify that the requested owner exists.
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
     * Admin can access any user's family tree.
     * No booking context is required because
     * this is an administrative action.
     */
    if (actorRole === Role.ADMIN) {
        return {
            ownerId:
                targetUser._id.toString(),
        };
    }

    /*
     * Coordinator can access only a customer
     * whose active booking is assigned to them.
     *
     * The booking information is returned so
     * the family-tree service can store which
     * booking caused the change.
     */
    if (actorRole === Role.COORDINATOR) {
        const activeBooking =
            await Booking.findOne({
                userId:
                    new Types.ObjectId(
                        requestedOwnerId,
                    ),

                isDeleted: false,

                status: "IN_PROGRESS",

                "assignment.status":
                    "ACCEPTED",

                "assignment.assignedCoordinatorId":
                    new Types.ObjectId(
                        actorId,
                    ),
            })
                .select(
                    "_id bookingReference",
                )
                .sort({
                    createdAt: -1,
                })
                .lean();

        if (!activeBooking) {
            throw new Error(
                "You are not authorized to manage this user's family tree",
            );
        }

        return {
            ownerId:
                targetUser._id.toString(),

            bookingId:
                activeBooking._id.toString(),

            ...(activeBooking.bookingReference && {
                bookingReference:
                    activeBooking.bookingReference,
            }),
        };
    }

    throw new Error(
        "You are not authorized to manage this family tree",
    );
};