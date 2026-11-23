import { Types } from "mongoose";
import { FamilyMember } from "../models/family-member.model.js";
import { createHash, randomBytes } from "node:crypto";
import { FamilyTreeDiscoveryToken } from "../models/family-tree-discovery-token.model.js";

export interface FamilyDiscoveryInput {
    fatherName: string;
    grandfatherName: string;
    nativeVillage?: string;
}

const normalize = (value: string): string => value.trim().replace(/\s+/g, " ");

const exactRegex = (value: string): RegExp => {
    const escaped = normalize(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&",);
    return new RegExp(`^${escaped.replace(/ /g, "\\s+")}$`, "i");
};

export class FamilyTreeDiscoveryService {
    static async discover(actorId: string, input: FamilyDiscoveryInput) {
        if (!Types.ObjectId.isValid(actorId)) {
            throw new Error("Invalid authenticated user ID");
        }


        const actorObjectId = new Types.ObjectId(actorId);

        const [ownsTree, linkedMember] = await Promise.all([
            FamilyMember.exists({ ownerId: actorObjectId, isDeleted: false }),
            FamilyMember.exists({ linkedUserId: actorObjectId, isDeleted: false }),
        ]);

        if (ownsTree || linkedMember) {
            throw new Error("Family discovery is only available before joining or creating a family tree");
        }

        const fatherName = normalize(input.fatherName ?? "");
        const grandfatherName = normalize(input.grandfatherName ?? "");

        if (fatherName.length < 2 || grandfatherName.length < 2) {
            throw new Error("Father and grandfather names are required");
        }

        const village = input.nativeVillage ? normalize(input.nativeVillage) : null;

        const fathers = await FamilyMember.find({
            ownerId: { $ne: new Types.ObjectId(actorId) },
            isDeleted: false,
            fullName: exactRegex(fatherName),
            fatherId: { $type: "objectId" },
            ...(village ? { nativeVillage: exactRegex(village) } : {}),
        })
            .select("_id ownerId fatherId")
            .lean();

        if (fathers.length === 0) {
            return {
                possibleMatchFound: false,
                matchCount: 0,
                requiresOwnerApproval: false,
            };
        }

        const grandfatherIds = fathers.map((father) => father.fatherId).filter((id): id is Types.ObjectId => Boolean(id));

        const grandfathers = await FamilyMember.find({
            _id: { $in: grandfatherIds },
            isDeleted: false,
            fullName: exactRegex(grandfatherName),
        })
            .select("_id ownerId")
            .lean();

        const grandfatherMap = new Map(grandfathers.map((member) => [member._id.toString(), member.ownerId.toString()]));
        const ownerIds = new Set<string>();

        for (const father of fathers) {
            if (!father.fatherId) continue;

            const grandfatherOwnerId = grandfatherMap.get(father.fatherId.toString());

            if (grandfatherOwnerId === father.ownerId.toString()) {
                ownerIds.add(father.ownerId.toString());
            }
        }

        const candidates = [];

        for (const treeOwnerId of ownerIds) {
            const discoveryToken = randomBytes(32).toString("hex");
            const tokenHash = createHash("sha256").update(discoveryToken).digest("hex");

            await FamilyTreeDiscoveryToken.create({
                requesterId: actorObjectId,
                treeOwnerId: new Types.ObjectId(treeOwnerId),
                tokenHash,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            });

            candidates.push({
                discoveryToken,
                matchType: "FATHER_AND_GRANDFATHER",
                requiresOwnerApproval: true,
            });
        }

        return {
            possibleMatchFound: candidates.length > 0,
            matchCount: candidates.length,
            candidates,
        };
    }
}
