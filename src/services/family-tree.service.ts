import mongoose, {
    type QueryFilter,
    Types,
} from "mongoose";

import {
    FamilyMember,
    type IFamilyMember,
} from "../models/family-member.model.js";

import {
    FamilyEdgeType,
    FamilyRelation,
    Gender,
    MemberLifeStatus,
} from "../types/enums.js";

export interface GetFamilyMembersQuery {
    search?: string;
    relation?: FamilyRelation;
    gender?: Gender;
    lifeStatus?: MemberLifeStatus;
    page?: number;
    limit?: number;
}

interface AddFamilyMemberPayload {
    fullName: string;
    relation: FamilyRelation;
    gender?: Gender;
    dob?: Date;
    lifeStatus?: MemberLifeStatus;
    dateOfDeath?: Date;

    fatherId?: string | null;
    motherId?: string | null;
    spouseIds?: string[];

    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: string;
    gotra?: string;

    designatedPandit?: string;
    visitors?: string[];

    profileImage?: string;
    notes?: string;
}

interface UpdateFamilyMemberPayload {
    fullName?: string;
    relation?: FamilyRelation;
    gender?: Gender;
    dob?: Date | null;
    lifeStatus?: MemberLifeStatus;
    dateOfDeath?: Date | null;

    fatherId?: string | null;
    motherId?: string | null;
    spouseIds?: string[];

    nativeVillage?: string;
    state?: string;
    district?: string;
    caste?: string | null;
    gotra?: string | null;

    designatedPandit?: string;
    visitors?: string[];

    profileImage?: string;
    notes?: string;
}

interface FamilyTreeEdge {
    id: string;
    source: string;
    target: string;
    relationType: FamilyEdgeType;
    parentType?: "FATHER" | "MOTHER";
    sourceRelation?: FamilyRelation;
    targetRelation?: FamilyRelation;
    label?: string;
}

class FamilyTreeService {
    private static getUniqueIds(
        ids: Array<string | Types.ObjectId | null | undefined>,
    ): string[] {
        return [
            ...new Set(
                ids
                    .filter(
                        (
                            id,
                        ): id is string | Types.ObjectId =>
                            Boolean(id),
                    )
                    .map((id) => id.toString()),
            ),
        ];
    }

    private static escapeRegex(value: string): string {
        return value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
    }

    private static async verifyFamilyMemberIds(
        ownerId: string,
        memberIds: Array<
            string | Types.ObjectId | null | undefined
        >,
    ): Promise<void> {
        const uniqueIds =
            FamilyTreeService.getUniqueIds(memberIds);

        if (uniqueIds.length === 0) {
            return;
        }

        const hasInvalidId = uniqueIds.some(
            (id) => !Types.ObjectId.isValid(id),
        );

        if (hasInvalidId) {
            throw new Error(
                "One or more family member IDs are invalid",
            );
        }

        const membersCount =
            await FamilyMember.countDocuments({
                _id: {
                    $in: uniqueIds,
                },
                ownerId,
            });

        if (membersCount !== uniqueIds.length) {
            throw new Error(
                "One or more selected family members do not belong to your family tree",
            );
        }
    }

    private static validateParentRelationships(
        memberId: string | null,
        fatherId?: string | null,
        motherId?: string | null,
    ): void {
        if (fatherId && motherId && fatherId === motherId) {
            throw new Error(
                "Father and mother cannot be the same member",
            );
        }

        if (memberId && fatherId === memberId) {
            throw new Error(
                "A family member cannot be their own father",
            );
        }

        if (memberId && motherId === memberId) {
            throw new Error(
                "A family member cannot be their own mother",
            );
        }
    }

    private static validateLifeStatus(
        lifeStatus: MemberLifeStatus,
        dateOfDeath?: Date | null,
    ): void {
        if (
            lifeStatus === MemberLifeStatus.ALIVE &&
            dateOfDeath
        ) {
            throw new Error(
                "Date of death cannot be provided for an alive member",
            );
        }
    }

    private static validateObjectId(
        id: string,
        fieldName: string,
    ): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error(
                `Invalid ${fieldName}`,
            );
        }
    }

    static async addFamilyMember(
        ownerId: string,
        actorId: string,
        payload: AddFamilyMemberPayload,
    ) {

        FamilyTreeService.validateObjectId(
            ownerId,
            "family-tree owner ID",
        );

        FamilyTreeService.validateObjectId(
            actorId,
            "authenticated user ID",
        );

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                fullName,
                relation,
                gender,
                dob,
                lifeStatus = MemberLifeStatus.ALIVE,
                dateOfDeath,
                fatherId,
                motherId,
                spouseIds = [],
                nativeVillage,
                state,
                district,
                caste,
                gotra,
                designatedPandit,
                visitors = [],
                profileImage,
                notes,
            } = payload;

            FamilyTreeService.validateParentRelationships(
                null,
                fatherId,
                motherId,
            );

            FamilyTreeService.validateLifeStatus(
                lifeStatus,
                dateOfDeath,
            );


            const uniqueSpouseIds =
                FamilyTreeService.getUniqueIds(spouseIds);

            await FamilyTreeService.verifyFamilyMemberIds(
                ownerId,
                [
                    fatherId,
                    motherId,
                    ...uniqueSpouseIds,
                ],
            );

            const memberData = {
                ownerId: new Types.ObjectId(ownerId),

                createdBy: new Types.ObjectId(actorId),
                updatedBy: new Types.ObjectId(actorId),

                fullName,
                relation,
                lifeStatus,

                fatherId: fatherId
                    ? new Types.ObjectId(fatherId)
                    : null,

                motherId: motherId
                    ? new Types.ObjectId(motherId)
                    : null,

                spouseIds: uniqueSpouseIds.map(
                    (id) => new Types.ObjectId(id),
                ),

                visitors,

                ...(gender !== undefined && { gender }),
                ...(dob !== undefined && { dob }),

                ...(lifeStatus === MemberLifeStatus.DECEASED &&
                    dateOfDeath !== undefined && {
                    dateOfDeath,
                }),

                ...(nativeVillage !== undefined && {
                    nativeVillage,
                }),

                ...(state !== undefined && { state }),

                ...(district !== undefined && {
                    district,
                }),

                ...(caste !== undefined && { caste }),

                ...(gotra !== undefined && { gotra }),

                ...(designatedPandit !== undefined && {
                    designatedPandit,
                }),

                ...(profileImage !== undefined && {
                    profileImage,
                }),

                ...(notes !== undefined && { notes }),
            };

            const createdMembers = await FamilyMember.create(
                [memberData],
                { session },
            );

            const familyMember = createdMembers[0];

            if (!familyMember) {
                throw new Error("Failed to create family member");
            }

            if (uniqueSpouseIds.length > 0) {
                await FamilyMember.updateMany(
                    {
                        _id: {
                            $in: uniqueSpouseIds,
                        },
                        ownerId,
                    },
                    {
                        $addToSet: {
                            spouseIds: familyMember._id,
                        },
                    },
                    {
                        session,
                    },
                );
            }

            await session.commitTransaction();

            const createdMember =
                await FamilyMember.findOne({
                    _id: familyMember._id,
                    ownerId,
                })
                    .populate(
                        "fatherId",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .populate(
                        "motherId",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .populate(
                        "spouseIds",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .lean();

            return createdMember;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }


    static async getFamilyTree(ownerId: string) {
        const members = await FamilyMember.find({
            ownerId,
        })
            .select(
                [
                    "fullName",
                    "relation",
                    "gender",
                    "dob",
                    "lifeStatus",
                    "dateOfDeath",
                    "fatherId",
                    "motherId",
                    "spouseIds",
                    "nativeVillage",
                    "state",
                    "district",
                    "caste",
                    "gotra",
                    "designatedPandit",
                    "visitors",
                    "profileImage",
                    "notes",
                    "createdAt",
                    "updatedAt",
                ].join(" "),
            )
            .sort({
                createdAt: 1,
            })
            .lean();

        /*
         * Contains all valid family-member IDs belonging
         * to the current owner.
         */
        const memberIdSet = new Set(
            members.map((member) =>
                member._id.toString(),
            ),
        );

        /*
         * Lets us quickly retrieve a complete member
         * using their ID.
         */
        const memberMap = new Map(
            members.map((member) => [
                member._id.toString(),
                member,
            ]),
        );

        const edges: FamilyTreeEdge[] = [];

        /*
         * Prevents the same marriage edge from appearing twice.
         *
         * For example:
         * Rahul contains Priya in spouseIds.
         * Priya contains Rahul in spouseIds.
         *
         * We should still return only one marriage edge.
         */
        const marriageEdgeSet = new Set<string>();

        for (const member of members) {
            const memberId = member._id.toString();

            /*
             * Father-to-child relationship
             */
            if (
                member.fatherId &&
                memberIdSet.has(
                    member.fatherId.toString(),
                )
            ) {
                const fatherId =
                    member.fatherId.toString();

                const fatherMember =
                    memberMap.get(fatherId);

                edges.push({
                    id: `father-${fatherId}-${memberId}`,
                    source: fatherId,
                    target: memberId,
                    relationType: FamilyEdgeType.PARENT,
                    parentType: "FATHER",

                    ...(fatherMember && {
                        sourceRelation:
                            fatherMember.relation,
                    }),

                    targetRelation:
                        member.relation,
                });
            }

            /*
             * Mother-to-child relationship
             */
            if (
                member.motherId &&
                memberIdSet.has(
                    member.motherId.toString(),
                )
            ) {
                const motherId =
                    member.motherId.toString();

                const motherMember =
                    memberMap.get(motherId);

                edges.push({
                    id: `mother-${motherId}-${memberId}`,
                    source: motherId,
                    target: memberId,
                    relationType: FamilyEdgeType.PARENT,
                    parentType: "MOTHER",

                    ...(motherMember && {
                        sourceRelation:
                            motherMember.relation,
                    }),

                    targetRelation:
                        member.relation,
                });
            }

            /*
             * Marriage relationship
             */
            for (
                const spouseObjectId of
                member.spouseIds || []
            ) {
                const spouseId =
                    spouseObjectId.toString();

                /*
                 * Ignore spouse IDs that are not present
                 * in the current owner's family tree.
                 */
                if (!memberIdSet.has(spouseId)) {
                    continue;
                }

                /*
                 * Sort both IDs so the same marriage gets
                 * the same key from either member.
                 */
                const [source, target]:
                    [string, string] =
                    memberId < spouseId
                        ? [memberId, spouseId]
                        : [spouseId, memberId];

                const marriageKey =
                    `${source}-${target}`;

                if (
                    marriageEdgeSet.has(
                        marriageKey,
                    )
                ) {
                    continue;
                }

                marriageEdgeSet.add(
                    marriageKey,
                );

                const sourceMember =
                    memberMap.get(source);

                const targetMember =
                    memberMap.get(target);

                edges.push({
                    id: `marriage-${marriageKey}`,
                    source,
                    target,
                    relationType: FamilyEdgeType.MARRIAGE,

                    ...(sourceMember && {
                        sourceRelation:
                            sourceMember.relation,
                    }),

                    ...(targetMember && {
                        targetRelation:
                            targetMember.relation,
                    }),
                });
            }
        }

        const nodes = members.map((member) => ({
            id: member._id.toString(),

            data: {
                fullName: member.fullName,
                relation: member.relation,
                gender: member.gender,
                dob: member.dob,
                lifeStatus: member.lifeStatus,
                dateOfDeath: member.dateOfDeath,

                fatherId:
                    member.fatherId?.toString() ||
                    null,

                motherId:
                    member.motherId?.toString() ||
                    null,

                spouseIds: (
                    member.spouseIds || []
                ).map((spouseId) =>
                    spouseId.toString(),
                ),

                nativeVillage:
                    member.nativeVillage,

                state:
                    member.state,

                district:
                    member.district,

                caste:
                    member.caste,

                gotra:
                    member.gotra,

                designatedPandit:
                    member.designatedPandit,

                visitors:
                    member.visitors,

                profileImage:
                    member.profileImage,

                notes:
                    member.notes,
            },
        }));

        /*
         * A root member is someone whose father and mother
         * are not connected to another valid member in
         * this family tree.
         */
        const rootMembers = members
            .filter((member) => {
                const hasValidFather =
                    Boolean(
                        member.fatherId &&
                        memberIdSet.has(
                            member.fatherId.toString(),
                        ),
                    );

                const hasValidMother =
                    Boolean(
                        member.motherId &&
                        memberIdSet.has(
                            member.motherId.toString(),
                        ),
                    );

                return (
                    !hasValidFather &&
                    !hasValidMother
                );
            })
            .map((member) => ({
                id: member._id.toString(),
                fullName: member.fullName,
                relation: member.relation,
            }));

        return {
            nodes,
            edges,
            rootMembers,
            totalMembers: nodes.length,
        };
    }

    static async getFamilyMembers(
        ownerId: string,
        query: GetFamilyMembersQuery,
    ) {
        const {
            search,
            relation,
            gender,
            lifeStatus,
            page = 1,
            limit = 20,
        } = query;

        const pageNumber = Math.max(1, page);

        const limitNumber = Math.min(
            100,
            Math.max(1, limit),
        );

        const skip =
            (pageNumber - 1) * limitNumber;

        const filter: QueryFilter<IFamilyMember> =
        {
            ownerId,
        };

        if (search?.trim()) {
            filter.fullName = {
                $regex:
                    FamilyTreeService.escapeRegex(
                        search.trim(),
                    ),
                $options: "i",
            };
        }

        if (relation) {
            filter.relation = relation;
        }

        if (gender) {
            filter.gender = gender;
        }

        if (lifeStatus) {
            filter.lifeStatus = lifeStatus;
        }

        const [familyMembers, totalMembers] =
            await Promise.all([
                FamilyMember.find(filter)
                    .select(
                        [
                            "fullName",
                            "relation",
                            "gender",
                            "dob",
                            "lifeStatus",
                            "dateOfDeath",
                            "fatherId",
                            "motherId",
                            "spouseIds",
                            "nativeVillage",
                            "state",
                            "district",
                            "profileImage",
                            "createdAt",
                        ].join(" "),
                    )
                    .populate(
                        "fatherId",
                        "fullName relation gender lifeStatus",
                    )
                    .populate(
                        "motherId",
                        "fullName relation gender lifeStatus",
                    )
                    .populate(
                        "spouseIds",
                        "fullName relation gender lifeStatus",
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(limitNumber)
                    .lean(),

                FamilyMember.countDocuments(filter),
            ]);

        const totalPages = Math.ceil(
            totalMembers / limitNumber,
        );

        return {
            familyMembers,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalMembers,
                limit: limitNumber,
                hasNextPage:
                    pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1,
            },
        };
    }

    static async getFamilyMemberById(
        ownerId: string,
        familyMemberId: string,
    ) {
        const familyMember =
            await FamilyMember.findOne({
                _id: familyMemberId,
                ownerId,
            })
                .populate(
                    "fatherId",
                    "fullName relation gender dob lifeStatus dateOfDeath profileImage",
                )
                .populate(
                    "motherId",
                    "fullName relation gender dob lifeStatus dateOfDeath profileImage",
                )
                .populate(
                    "spouseIds",
                    "fullName relation gender dob lifeStatus dateOfDeath profileImage",
                )
                .lean();

        if (!familyMember) {
            throw new Error(
                "Family member not found",
            );
        }

        const children = await FamilyMember.find({
            ownerId,
            $or: [
                {
                    fatherId: familyMember._id,
                },
                {
                    motherId: familyMember._id,
                },
            ],
        })
            .select(
                "fullName relation gender dob lifeStatus dateOfDeath profileImage fatherId motherId",
            )
            .sort({
                dob: 1,
                createdAt: 1,
            })
            .lean();

        return {
            ...familyMember,
            children,
        };
    }

    static async updateFamilyMember(
        ownerId: string,
        actorId: string,
        familyMemberId: string,
        payload: UpdateFamilyMemberPayload,
    ) {

        FamilyTreeService.validateObjectId(
            ownerId,
            "family-tree owner ID",
        );

        FamilyTreeService.validateObjectId(
            actorId,
            "authenticated user ID",
        );

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const existingMember =
                await FamilyMember.findOne({
                    _id: familyMemberId,
                    ownerId,
                }).session(session);

            if (!existingMember) {
                throw new Error(
                    "Family member not found",
                );
            }

            const finalFatherId =
                payload.fatherId !== undefined
                    ? payload.fatherId
                    : existingMember.fatherId?.toString() ||
                    null;

            const finalMotherId =
                payload.motherId !== undefined
                    ? payload.motherId
                    : existingMember.motherId?.toString() ||
                    null;

            FamilyTreeService.validateParentRelationships(
                familyMemberId,
                finalFatherId,
                finalMotherId,
            );

            let uniqueSpouseIds:
                | string[]
                | undefined;

            if (payload.spouseIds !== undefined) {
                uniqueSpouseIds =
                    FamilyTreeService.getUniqueIds(
                        payload.spouseIds,
                    );

                if (
                    uniqueSpouseIds.includes(
                        familyMemberId,
                    )
                ) {
                    throw new Error(
                        "A family member cannot be their own spouse",
                    );
                }
            }

            await FamilyTreeService.verifyFamilyMemberIds(
                ownerId,
                [
                    finalFatherId,
                    finalMotherId,
                    ...(uniqueSpouseIds || []),
                ],
            );

            const finalLifeStatus =
                payload.lifeStatus ||
                existingMember.lifeStatus;

            let finalDateOfDeath:
                | Date
                | null
                | undefined;

            if (
                payload.lifeStatus ===
                MemberLifeStatus.ALIVE
            ) {
                finalDateOfDeath = null;
            } else if (
                payload.dateOfDeath !== undefined
            ) {
                finalDateOfDeath =
                    payload.dateOfDeath;
            } else {
                finalDateOfDeath =
                    existingMember.dateOfDeath;
            }

            FamilyTreeService.validateLifeStatus(
                finalLifeStatus,
                finalDateOfDeath,
            );

            const updateData: Record<
                string,
                unknown
            > = {
                updatedBy: new Types.ObjectId(actorId),
            };


            const normalFields: Array<
                keyof UpdateFamilyMemberPayload
            > = [
                    "fullName",
                    "relation",
                    "gender",
                    "nativeVillage",
                    "state",
                    "district",
                    "designatedPandit",
                    "visitors",
                    "profileImage",
                    "notes",
                ];

            for (const field of normalFields) {
                if (payload[field] !== undefined) {
                    updateData[field] =
                        payload[field];
                }
            }

            if (payload.dob !== undefined) {
                updateData.dob =
                    payload.dob || null;
            }

            if (
                payload.lifeStatus !== undefined
            ) {
                updateData.lifeStatus =
                    payload.lifeStatus;
            }

            if (
                payload.lifeStatus ===
                MemberLifeStatus.ALIVE
            ) {
                updateData.dateOfDeath = null;
            } else if (
                payload.dateOfDeath !== undefined
            ) {
                updateData.dateOfDeath =
                    payload.dateOfDeath || null;
            }

            if (payload.fatherId !== undefined) {
                updateData.fatherId =
                    payload.fatherId || null;
            }

            if (payload.motherId !== undefined) {
                updateData.motherId =
                    payload.motherId || null;
            }

            if (payload.caste !== undefined) {
                updateData.caste =
                    payload.caste || null;
            }

            if (payload.gotra !== undefined) {
                updateData.gotra =
                    payload.gotra || null;
            }

            if (uniqueSpouseIds !== undefined) {
                updateData.spouseIds =
                    uniqueSpouseIds;

                const previousSpouseIds =
                    existingMember.spouseIds.map(
                        (spouseId) =>
                            spouseId.toString(),
                    );

                const removedSpouseIds =
                    previousSpouseIds.filter(
                        (spouseId) =>
                            !uniqueSpouseIds!.includes(
                                spouseId,
                            ),
                    );

                const addedSpouseIds =
                    uniqueSpouseIds.filter(
                        (spouseId) =>
                            !previousSpouseIds.includes(
                                spouseId,
                            ),
                    );

                if (removedSpouseIds.length > 0) {
                    await FamilyMember.updateMany(
                        {
                            _id: {
                                $in: removedSpouseIds,
                            },
                            ownerId,
                        },
                        {
                            $pull: {
                                spouseIds:
                                    existingMember._id,
                            },
                        },
                        {
                            session,
                        },
                    );
                }

                if (addedSpouseIds.length > 0) {
                    await FamilyMember.updateMany(
                        {
                            _id: {
                                $in: addedSpouseIds,
                            },
                            ownerId,
                        },
                        {
                            $addToSet: {
                                spouseIds:
                                    existingMember._id,
                            },
                        },
                        {
                            session,
                        },
                    );
                }
            }

            await FamilyMember.updateOne(
                {
                    _id: familyMemberId,
                    ownerId,
                },
                {
                    $set: updateData,
                },
                {
                    session,
                    runValidators: true,
                },
            );

            await session.commitTransaction();

            const updatedMember =
                await FamilyMember.findOne({
                    _id: familyMemberId,
                    ownerId,
                })
                    .populate(
                        "fatherId",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .populate(
                        "motherId",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .populate(
                        "spouseIds",
                        "fullName relation gender lifeStatus profileImage",
                    )
                    .lean();

            return updatedMember;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async deleteFamilyMember(
        ownerId: string,
        familyMemberId: string,
    ) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const familyMember =
                await FamilyMember.findOne({
                    _id: familyMemberId,
                    ownerId,
                }).session(session);

            if (!familyMember) {
                throw new Error(
                    "Family member not found",
                );
            }

            await FamilyMember.updateMany(
                {
                    ownerId,
                    spouseIds: familyMember._id,
                },
                {
                    $pull: {
                        spouseIds: familyMember._id,
                    },
                },
                {
                    session,
                },
            );

            await FamilyMember.updateMany(
                {
                    ownerId,
                    fatherId: familyMember._id,
                },
                {
                    $set: {
                        fatherId: null,
                    },
                },
                {
                    session,
                },
            );

            await FamilyMember.updateMany(
                {
                    ownerId,
                    motherId: familyMember._id,
                },
                {
                    $set: {
                        motherId: null,
                    },
                },
                {
                    session,
                },
            );

            await FamilyMember.deleteOne(
                {
                    _id: familyMember._id,
                    ownerId,
                },
                {
                    session,
                },
            );

            await session.commitTransaction();

            return {
                id: familyMember._id,
                fullName: familyMember.fullName,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export default FamilyTreeService;