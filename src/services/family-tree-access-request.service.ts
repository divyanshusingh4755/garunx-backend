import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { FamilyMember } from "../models/family-member.model.js";
import { FamilyTreeAccessRequest } from "../models/family-tree-access-request.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { FamilyTreeDiscoveryToken } from "../models/family-tree-discovery-token.model.js";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const objectId = (value: string, field: string): Types.ObjectId => {
    if (!Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${field}`);
    }

    return new Types.ObjectId(value);
};

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export class FamilyTreeAccessRequestService {
    private static async requireMember(treeOwnerId: string, familyMemberId: string) {
        const member = await FamilyMember.findOne({
            _id: objectId(familyMemberId, "family member ID"),
            ownerId: objectId(treeOwnerId, "tree owner ID"),
            isDeleted: false,
        });

        if (!member) {
            throw new Error("Family member not found");
        }

        if (member.linkedUserId) {
            throw new Error("Family member already linked to an account");
        }

        return member;
    }

    static async createInvitation(actorId: string, familyMemberId: string, recipient: { email?: string; phoneNumber?: string; }) {
        const member = await FamilyMember.findOne({
            _id: objectId(familyMemberId, "family member ID"),
            ownerId: objectId(actorId, "authenticated user ID"),
            isDeleted: false,
        });

        if (!member) {
            throw new Error("Family member not found or access denied");
        }

        if (member.linkedUserId) {
            throw new Error("Family member already linked to an account");
        }

        const existing = await FamilyTreeAccessRequest.exists({
            familyMemberId: member._id,
            type: "INVITATION",
            status: "PENDING",
        });

        if (existing) {
            throw new Error("A pending invitation already exists");
        }

        const invitedEmail = recipient.email?.trim().toLowerCase();
        const invitedPhoneNumber = recipient.phoneNumber?.trim();

        if (!invitedEmail && !invitedPhoneNumber) {
            throw new Error("Invitation recipient email or phone number is required");
        }

        const invitationToken = randomBytes(32).toString("hex");

        const request = await FamilyTreeAccessRequest.create({
            treeOwnerId: member.ownerId,
            familyMemberId: member._id,
            type: "INVITATION",
            status: "PENDING",
            invitationTokenHash: hashToken(invitationToken),
            invitationExpiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
            createdBy: objectId(actorId, "authenticated user ID"),
            invitedEmail: invitedEmail ?? null,
            invitedPhoneNumber: invitedPhoneNumber ?? null,
        });

        return {
            requestId: request._id.toString(),
            invitationToken,
            expiresAt: request.invitationExpiresAt,
        };
    }

    static async requestToJoin(requesterId: string, treeOwnerId: string, familyMemberId: string) {
        if (requesterId === treeOwnerId) {
            throw new Error("You already own this family tree");
        }

        const requester = await User.findOne({
            _id: objectId(requesterId, "requester ID"),
            isActive: true,
            isOtpVerified: true,
        }).select("_id").lean();

        if (!requester) {
            throw new Error("Verified account required");
        }

        await this.requireMember(treeOwnerId, familyMemberId);

        const existing = await FamilyTreeAccessRequest.exists({
            familyMemberId: objectId(familyMemberId, "family member ID"),
            requesterId: requester._id,
            type: "JOIN_REQUEST",
            status: "PENDING",
        });

        if (existing) {
            throw new Error("Join request already pending");
        }

        const request = await FamilyTreeAccessRequest.create({
            treeOwnerId: objectId(treeOwnerId, "tree owner ID"),
            familyMemberId: objectId(familyMemberId, "family member ID"),
            requesterId: requester._id,
            type: "JOIN_REQUEST",
            status: "PENDING",
            createdBy: requester._id,
        });

        return {
            requestId: request._id.toString(),
            status: request.status,
        };
    }

    static async getPendingRequests(treeOwnerId: string) {
        return FamilyTreeAccessRequest.find({
            treeOwnerId: objectId(treeOwnerId, "tree owner ID"),
            type: "JOIN_REQUEST",
            status: "PENDING",
        })
            .select("-invitationTokenHash")
            .sort({ createdAt: -1 })
            .lean();
    }

    static async decideJoinRequest(ownerId: string, requestId: string, decision: "APPROVED" | "REJECTED", confirmedFamilyMemberId?: string) {
        if (decision !== "APPROVED" && decision !== "REJECTED") {
            throw new Error("Invalid decision");
        }

        const ownerObjectId = objectId(ownerId, "authenticated user ID");
        const requestObjectId = objectId(requestId, "request ID");

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const request = await FamilyTreeAccessRequest.findOne({
                _id: requestObjectId,
                treeOwnerId: ownerObjectId,
                type: "JOIN_REQUEST",
                status: "PENDING",
            }).session(session);

            if (!request || !request.requesterId) {
                throw new Error("Pending join request not found");
            }

            let resolvedMemberId = request.familyMemberId ?? null;

            if (decision === "APPROVED") {
                if (resolvedMemberId && confirmedFamilyMemberId && resolvedMemberId.toString() !== confirmedFamilyMemberId) {
                    throw new Error("Cannot change the member on an existing join request");
                }

                if (!resolvedMemberId) {
                    if (!confirmedFamilyMemberId) {
                        throw new Error("A confirmed familyMemberId is required for approval");
                    }

                    resolvedMemberId = objectId(confirmedFamilyMemberId, "family member ID");
                }

                if (request.requesterId.equals(request.treeOwnerId)) {
                    throw new Error("Cannot approve the tree owner as a joining member");
                }

                const member = await FamilyMember.findOne({
                    _id: resolvedMemberId,
                    ownerId: request.treeOwnerId,
                    isDeleted: false,
                    linkedUserId: null,
                })
                    .select("_id")
                    .session(session);

                if (!member) {
                    throw new Error("Family member not found or already linked");
                }

                // Reuse the existing transactional member-claim logic.
                await this.claimMember(request.requesterId.toString(), resolvedMemberId, request.treeOwnerId, session);

                // Persist the confirmed member for discovery requests.
                request.familyMemberId = resolvedMemberId;
            }

            request.status = decision;
            request.decidedBy = ownerObjectId;
            request.decidedAt = new Date();

            await request.save({ session });
            await session.commitTransaction();

            return {
                requestId: request._id.toString(),
                status: request.status,
                familyMemberId: request.familyMemberId?.toString() ?? null,
                accessEnabled: decision === "APPROVED",
            };
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            throw error;
        } finally {
            await session.endSession();
        }
    }

    private static async claimMember(requesterId: string, familyMemberId: Types.ObjectId, treeOwnerId: Types.ObjectId, session: ClientSession): Promise<void> {
        const userId = objectId(requesterId, "requester ID");
        const requester = await User.findOne({ _id: userId, isActive: true, isOtpVerified: true })
            .select("_id")
            .session(session);

        if (!requester) {
            throw new Error("Verified active account required");
        }

        const alreadyLinked = await FamilyMember.exists({ linkedUserId: userId }).session(session);
        if (alreadyLinked) {
            throw new Error("Your account is already linked to a family member");
        }


        const alreadyOwnsTree = await FamilyMember.exists({ ownerId: userId, isDeleted: false }).session(session);
        if (alreadyOwnsTree) {
            throw new Error("Your account already owns a family tree");
        }

        const result = await FamilyMember.updateOne(
            {
                _id: familyMemberId,
                ownerId: treeOwnerId,
                isDeleted: false,
                linkedUserId: null,
            },
            {
                $set: {
                    linkedUserId: userId,
                    updatedBy: userId,
                },
            },
            { session },
        );

        if (result.modifiedCount !== 1) {
            throw new Error("Family member has already been claimed or is unavailable");
        }
    }

    static async acceptInvitation(actorId: string, invitationToken: string) {
        if (!/^[a-f0-9]{64}$/.test(invitationToken)) {
            throw new Error("Invalid invitation token");
        }

        const tokenHash = hashToken(invitationToken);
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const request = await FamilyTreeAccessRequest.findOne({
                invitationTokenHash: tokenHash,
                type: "INVITATION",
                status: "PENDING",
                invitationExpiresAt: { $gt: new Date() },
            })
                .select("+invitationTokenHash")
                .session(session);

            if (!request) {
                throw new Error("Invitation invalid or expired");
            }

            const user = await User.findOne({
                _id: objectId(actorId, "authenticated user ID"),
                isActive: true,
                isOtpVerified: true,
            })
                .select("_id email phoneNumber verifiedEmail verifiedPhoneNumber")
                .session(session);

            if (!user) {
                throw new Error("Verified active account required");
            }

            const emailMatches = Boolean(
                request.invitedEmail &&
                user.verifiedEmail &&
                user.email?.toLowerCase() === request.invitedEmail &&
                user.verifiedEmail.toLowerCase() === request.invitedEmail
            );

            const phoneMatches = Boolean(
                request.invitedPhoneNumber &&
                user.verifiedPhoneNumber &&
                user.phoneNumber === request.invitedPhoneNumber &&
                user.verifiedPhoneNumber === request.invitedPhoneNumber
            );

            if (!emailMatches && !phoneMatches) {
                throw new Error("Invitation recipient contact has not been verified");
            }

            if (user._id.equals(request.treeOwnerId)) {
                throw new Error("Cannot claim your own invitation");
            }


            const familyMemberId = request.familyMemberId;

            if (!familyMemberId) {
                throw new Error("Invitation has no family member");
            }

            await this.claimMember(
                actorId,
                familyMemberId,
                request.treeOwnerId,
                session,
            );


            const result = await FamilyTreeAccessRequest.updateOne(
                {
                    _id: request._id,
                    status: "PENDING",
                },
                {
                    $set: {
                        status: "APPROVED",
                        requesterId: user._id,
                        decidedBy: user._id,
                        decidedAt: new Date(),
                        invitationTokenHash: null,
                    },
                },
                { session },
            );

            if (result.modifiedCount !== 1) {
                throw new Error("Invitation already processed");
            }

            await session.commitTransaction();

            return {
                success: true,
                familyMemberId: familyMemberId.toString(),
                linkedUserId: actorId,
                accessEnabled: true,
            };
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            await session.endSession();
        }
    }

    static async activateApprovedJoinRequest(actorId: string, requestId: string) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const request = await FamilyTreeAccessRequest.findOne({
                _id: objectId(requestId, "request ID"),
                requesterId: objectId(actorId, "authenticated user ID"),
                type: "JOIN_REQUEST",
                status: "APPROVED",
            }).session(session);

            if (!request) {
                throw new Error("Approved join request not found");
            }

            const familyMemberId = request.familyMemberId;

            if (!familyMemberId) {
                throw new Error("Approved join request has no linked family member");
            }

            const member = await FamilyMember.findOne({
                _id: familyMemberId,
                ownerId: request.treeOwnerId,
                linkedUserId: objectId(actorId, "authenticated user ID"),
                isDeleted: false,
            })
                .select("_id")
                .session(session);

            if (!member) {
                throw new Error("Approved request has not been linked to your account");
            }

            await session.commitTransaction();

            return {
                success: true,
                familyMemberId: member._id.toString(),
                linkedUserId: actorId,
                accessEnabled: true,
            };
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            await session.endSession();
        }
    }

    static async validateInvitation(invitationToken: string) {
        if (!/^[a-f0-9]{64}$/.test(invitationToken)) {
            throw new Error("Invalid invitation token");
        }

        const request = await FamilyTreeAccessRequest.findOne({
            invitationTokenHash: hashToken(invitationToken),
            type: "INVITATION",
            status: "PENDING",
            invitationExpiresAt: { $gt: new Date() },
        }).select("+invitationTokenHash");

        if (!request) {
            throw new Error("Invitation invalid or expired");
        }


        const familyMemberId = request.familyMemberId;

        if (!familyMemberId) {
            throw new Error("Invitation has no family member");
        }

        await this.requireMember(request.treeOwnerId.toString(), familyMemberId.toString());
        // Do not return the token hash or private member data.
        return {
            requestId: request._id.toString(),
            valid: true,
        };
    }

    static async requestToJoinDiscoveredTree(requesterId: string, discoveryToken: string) {
        const requesterObjectId = objectId(requesterId, "requester ID");

        if (!/^[a-f0-9]{64}$/.test(discoveryToken)) {
            throw new Error("Invalid discovery token");
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const requester = await User.findOne({
                _id: requesterObjectId,
                isActive: true,
                isOtpVerified: true,
            })
                .select("_id")
                .session(session);

            if (!requester) {
                throw new Error("Verified active account required");
            }

            const existingMember = await FamilyMember.exists({
                $or: [
                    {
                        ownerId: requesterObjectId,
                        isDeleted: false,
                    },
                    {
                        linkedUserId: requesterObjectId,
                        isDeleted: false,
                    },
                ],
            }).session(session);

            if (existingMember) {
                throw new Error("You already belong to a family tree");
            }

            // Atomically consume the token inside the transaction.
            const discovery = await FamilyTreeDiscoveryToken.findOneAndDelete(
                {
                    tokenHash: hashToken(discoveryToken),
                    requesterId: requesterObjectId,
                    expiresAt: { $gt: new Date() },
                },
                { session },
            );

            if (!discovery) {
                throw new Error("Discovery token is invalid or expired");
            }

            if (discovery.treeOwnerId.equals(requesterObjectId)) {
                throw new Error("Cannot join your own family tree");
            }

            const existingRequest = await FamilyTreeAccessRequest.exists({
                treeOwnerId: discovery.treeOwnerId,
                requesterId: requesterObjectId,
                type: "JOIN_REQUEST",
                status: "PENDING",
            }).session(session);

            if (existingRequest) {
                throw new Error("Join request already pending");
            }

            const [request] =
                await FamilyTreeAccessRequest.create(
                    [
                        {
                            treeOwnerId: discovery.treeOwnerId,
                            familyMemberId: null,
                            requesterId: requesterObjectId,
                            type: "JOIN_REQUEST",
                            status: "PENDING",
                            createdBy: requesterObjectId,
                        },
                    ],
                    { session },
                );

            if (!request) {
                throw new Error("Failed to create join request");
            }

            await session.commitTransaction();

            return {
                requestId: request._id.toString(),
                status: request.status,
            };
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            throw error;
        } finally {
            await session.endSession();
        }
    }
}
