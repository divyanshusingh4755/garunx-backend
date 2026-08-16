import mongoose, {
  type ClientSession,
  type QueryFilter,
  Types,
} from "mongoose";

import {
  FamilyMember,
  type IFamilyMember,
} from "../models/family-member.model.js";

import {
  FamilyTreeActivity,
  type FamilyTreeActivityAction,
  type FamilyTreeActivitySource,
} from "../models/family-tree-activity.model.js";

import {
  FamilyEdgeType,
  FamilyRelation,
  Gender,
  MemberLifeStatus,
} from "../types/enums.js";

import { OutboxService } from "./outbox.service.js";
import { DOMAIN_EVENTS } from "../events/domain-events.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

export interface GetFamilyTreeActivitiesQuery {
  action?: string;
  familyMemberId?: string;
  performedBy?: string;
  bookingId?: string;
  page?: number;
  limit?: number;
}

export interface GetFamilyMemberActivitiesQuery {
  page?: number;
  limit?: number;
}

export interface GetFamilyMembersQuery {
  search?: string;
  relation?: FamilyRelation;
  gender?: Gender;
  lifeStatus?: MemberLifeStatus;
  page?: number;
  limit?: number;
}

export interface FamilyTreeActorContext {
  ownerId: string;
  actorId: string;
  actorRole: string;
  source: FamilyTreeActivitySource;
  bookingId?: string;
  bookingReference?: string;
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

interface AuditChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const FAMILY_MEMBER_POPULATE_SELECT =
  "fullName relation gender dob lifeStatus dateOfDeath profileImage";

const AUDITABLE_FIELDS: Array<keyof UpdateFamilyMemberPayload> = [
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
];

class FamilyTreeService {
  private static async invalidateFamilyTreeCache(
    ownerId: string,
  ): Promise<void> {
    await Promise.all([
      RedisCacheService.delete(
        CacheKeys.familyTree(
          ownerId,
        ),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.familyMemberListPattern(
          ownerId,
        ),
      ),

      RedisCacheService.deleteByPattern(
        CacheKeys.familyMemberDetailPattern(
          ownerId,
        ),
      ),
    ]);
  }

  private static validateContext(context: FamilyTreeActorContext): void {
    if (!Types.ObjectId.isValid(context.ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    if (!Types.ObjectId.isValid(context.actorId)) {
      throw new Error("Invalid authenticated user ID");
    }

    if (context.bookingId && !Types.ObjectId.isValid(context.bookingId)) {
      throw new Error("Invalid booking ID");
    }
  }

  private static shouldNotifyOwner(
    context: FamilyTreeActorContext,
  ): boolean {
    return (
      context.actorId !== context.ownerId &&
      (
        context.source === "COORDINATOR_BOOKING" ||
        context.source === "ADMIN_MANUAL"
      )
    );
  }

  private static getUniqueIds(
    ids: Array<string | Types.ObjectId | null | undefined>,
  ): string[] {
    return [
      ...new Set(
        ids
          .filter((id): id is string | Types.ObjectId => Boolean(id))
          .map((id) => id.toString()),
      ),
    ];
  }

  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static normalizeAuditValue(value: unknown): unknown {
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => FamilyTreeService.normalizeAuditValue(item));
    }

    if (value && typeof value === "object") {
      const normalized: Record<string, unknown> = {};

      for (const [key, nestedValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        normalized[key] = FamilyTreeService.normalizeAuditValue(nestedValue);
      }

      return normalized;
    }

    return value ?? null;
  }

  private static valuesAreEqual(
    firstValue: unknown,
    secondValue: unknown,
  ): boolean {
    return (
      JSON.stringify(FamilyTreeService.normalizeAuditValue(firstValue)) ===
      JSON.stringify(FamilyTreeService.normalizeAuditValue(secondValue))
    );
  }

  private static buildChanges(
    existingMember: IFamilyMember,
    updateData: Record<string, unknown>,
  ): AuditChange[] {
    const existingObject = existingMember.toObject() as Record<string, unknown>;

    const changes: AuditChange[] = [];

    for (const field of AUDITABLE_FIELDS) {
      if (!(field in updateData)) {
        continue;
      }

      const oldValue = existingObject[field];
      const newValue = updateData[field];

      if (FamilyTreeService.valuesAreEqual(oldValue, newValue)) {
        continue;
      }

      changes.push({
        field,
        oldValue: FamilyTreeService.normalizeAuditValue(oldValue),
        newValue: FamilyTreeService.normalizeAuditValue(newValue),
      });
    }

    return changes;
  }

  private static async createActivity(
    context: FamilyTreeActorContext,
    familyMemberId: Types.ObjectId,
    action: FamilyTreeActivityAction,
    changes: AuditChange[],
    session: ClientSession,
    options?: {
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await FamilyTreeActivity.create(
      [
        {
          ownerId: new Types.ObjectId(context.ownerId),

          familyMemberId,

          action,

          performedBy: new Types.ObjectId(context.actorId),

          performedByRole: context.actorRole,

          source: context.source,

          ...(context.bookingId && {
            bookingId: new Types.ObjectId(context.bookingId),
          }),

          ...(context.bookingReference && {
            bookingReference: context.bookingReference,
          }),

          changes,

          ...(options?.reason && {
            reason: options.reason,
          }),

          ...(options?.metadata && {
            metadata: options.metadata,
          }),
        },
      ],
      {
        session,
      },
    );
  }

  private static async verifyFamilyMemberIds(
    ownerId: string,
    memberIds: Array<string | Types.ObjectId | null | undefined>,
    session?: ClientSession,
  ): Promise<void> {
    const uniqueIds = FamilyTreeService.getUniqueIds(memberIds);

    if (uniqueIds.length === 0) {
      return;
    }

    const hasInvalidId = uniqueIds.some((id) => !Types.ObjectId.isValid(id));

    if (hasInvalidId) {
      throw new Error("One or more family member IDs are invalid");
    }

    const query = FamilyMember.countDocuments({
      _id: {
        $in: uniqueIds.map((id) => new Types.ObjectId(id)),
      },
      ownerId: new Types.ObjectId(ownerId),
      isDeleted: false,
    });

    if (session) {
      query.session(session);
    }

    const membersCount = await query;

    if (membersCount !== uniqueIds.length) {
      throw new Error(
        "One or more selected family members do not belong to this family tree",
      );
    }
  }

  private static validateParentRelationships(
    memberId: string | null,
    fatherId?: string | null,
    motherId?: string | null,
  ): void {
    if (fatherId && motherId && fatherId === motherId) {
      throw new Error("Father and mother cannot be the same member");
    }

    if (memberId && fatherId === memberId) {
      throw new Error("A family member cannot be their own father");
    }

    if (memberId && motherId === memberId) {
      throw new Error("A family member cannot be their own mother");
    }
  }

  private static validateLifeStatus(
    lifeStatus: MemberLifeStatus,
    dateOfDeath?: Date | null,
    dob?: Date | null,
  ): void {
    if (
      lifeStatus === MemberLifeStatus.ALIVE &&
      dateOfDeath
    ) {
      throw new Error(
        "Date of death cannot be provided for an alive member",
      );
    }

    if (
      lifeStatus !== MemberLifeStatus.ALIVE &&
      !dateOfDeath
    ) {
      throw new Error(
        "Date of death is required for a deceased family member",
      );
    }

    if (
      dob &&
      dob.getTime() > Date.now()
    ) {
      throw new Error(
        "DOB cannot be in the future",
      );
    }

    if (
      dob &&
      dateOfDeath &&
      dateOfDeath < dob
    ) {
      throw new Error(
        "Date of death cannot be before DOB",
      );
    }
  }

  private static async populateMember(
    ownerId: string,
    familyMemberId: string | Types.ObjectId,
  ) {
    return FamilyMember.findOne({
      _id: familyMemberId,
      ownerId: new Types.ObjectId(ownerId),
      isDeleted: false,
    })
      .populate({
        path: "fatherId",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: { isDeleted: false },
      })
      .populate({
        path: "motherId",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: { isDeleted: false },
      })
      .populate({
        path: "spouseIds",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: { isDeleted: false },
      })
      .populate("createdBy", "fullName role userReference")
      .populate("updatedBy", "fullName role userReference")
      .lean();
  }

  static async addFamilyMember(
    context: FamilyTreeActorContext,
    payload: AddFamilyMemberPayload,
  ) {
    FamilyTreeService.validateContext(context);

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

      FamilyTreeService.validateParentRelationships(null, fatherId, motherId);

      FamilyTreeService.validateLifeStatus(lifeStatus, dateOfDeath, dob);

      const uniqueSpouseIds = FamilyTreeService.getUniqueIds(spouseIds);

      await FamilyTreeService.verifyFamilyMemberIds(
        context.ownerId,
        [fatherId, motherId, ...uniqueSpouseIds],
        session,
      );

      const memberData = {
        ownerId: new Types.ObjectId(context.ownerId),

        fullName,
        relation,
        lifeStatus,

        fatherId: fatherId ? new Types.ObjectId(fatherId) : null,

        motherId: motherId ? new Types.ObjectId(motherId) : null,

        spouseIds: uniqueSpouseIds.map((id) => new Types.ObjectId(id)),

        visitors,

        createdBy: new Types.ObjectId(context.actorId),

        updatedBy: new Types.ObjectId(context.actorId),

        source: context.source,

        ...(context.bookingId && {
          sourceBookingId: new Types.ObjectId(context.bookingId),
        }),

        ...(context.bookingReference && {
          sourceBookingReference: context.bookingReference,
        }),

        isDeleted: false,

        ...(gender !== undefined && {
          gender,
        }),

        ...(dob !== undefined && {
          dob,
        }),

        ...(lifeStatus === MemberLifeStatus.DECEASED &&
          dateOfDeath !== undefined && {
          dateOfDeath,
        }),

        ...(nativeVillage !== undefined && {
          nativeVillage,
        }),

        ...(state !== undefined && {
          state,
        }),

        ...(district !== undefined && {
          district,
        }),

        ...(caste !== undefined && {
          caste,
        }),

        ...(gotra !== undefined && {
          gotra,
        }),

        ...(designatedPandit !== undefined && {
          designatedPandit,
        }),

        ...(profileImage !== undefined && {
          profileImage,
        }),

        ...(notes !== undefined && {
          notes,
        }),
      };

      const createdMembers = await FamilyMember.create([memberData], {
        session,
      });

      const familyMember = createdMembers[0];

      if (!familyMember) {
        throw new Error("Failed to create family member");
      }

      if (uniqueSpouseIds.length > 0) {
        await FamilyMember.updateMany(
          {
            _id: {
              $in: uniqueSpouseIds.map((id) => new Types.ObjectId(id)),
            },

            ownerId: new Types.ObjectId(context.ownerId),

            isDeleted: false,
          },
          {
            $addToSet: {
              spouseIds: familyMember._id,
            },

            $set: {
              updatedBy: new Types.ObjectId(context.actorId),
            },
          },
          {
            session,
          },
        );
      }

      await FamilyTreeService.createActivity(
        context,
        familyMember._id,
        "MEMBER_ADDED",
        [
          {
            field: "member",
            newValue: {
              fullName,
              relation,
              lifeStatus,
              fatherId: fatherId ?? null,
              motherId: motherId ?? null,
              spouseIds: uniqueSpouseIds,
            },
          },
        ],
        session,
      );

      if (FamilyTreeService.shouldNotifyOwner(context)) {
        await OutboxService.createEvent({
          eventType: DOMAIN_EVENTS.FAMILY_TREE_MEMBER_ADDED,
          aggregateType: "FAMILY_MEMBER",
          aggregateId: familyMember._id.toString(),
          payload: {
            ownerId: context.ownerId,
            familyMemberId: familyMember._id.toString(),
            fullName: familyMember.fullName,
            relation: familyMember.relation,
            performedByRole: context.actorRole,
            source: context.source,
            ...(context.bookingId && {
              bookingId: context.bookingId,
            }),
            ...(context.bookingReference && {
              bookingReference: context.bookingReference,
            }),
          },
          session,
        });
      }

      await session.commitTransaction();

      await this.invalidateFamilyTreeCache(
        context.ownerId,
      );

      return FamilyTreeService.populateMember(
        context.ownerId,
        familyMember._id,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getFamilyTree(
    ownerId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new Error(
        "Invalid family tree owner ID",
      );
    }

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.familyTree(
          ownerId,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .FAMILY_TREE,

      loader:
        async () => {
          const members =
            await FamilyMember.find({
              ownerId:
                new Types.ObjectId(
                  ownerId,
                ),

              isDeleted:
                false,
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
                  "createdBy",
                  "updatedBy",
                  "source",
                  "sourceBookingId",
                  "sourceBookingReference",
                  "createdAt",
                  "updatedAt",
                ].join(
                  " ",
                ),
              )
              .populate(
                "createdBy",
                "fullName role userReference",
              )
              .populate(
                "updatedBy",
                "fullName role userReference",
              )
              .sort({
                createdAt: 1,
              })
              .lean();

          const memberIdSet =
            new Set(
              members.map(
                (
                  member,
                ) =>
                  member._id
                    .toString(),
              ),
            );

          const memberMap =
            new Map(
              members.map(
                (
                  member,
                ) => [
                    member._id
                      .toString(),
                    member,
                  ],
              ),
            );

          const edges:
            FamilyTreeEdge[] =
            [];

          const marriageEdgeSet =
            new Set<string>();

          for (
            const member
            of members
          ) {
            const memberId =
              member._id
                .toString();

            if (
              member.fatherId &&
              memberIdSet.has(
                member.fatherId
                  .toString(),
              )
            ) {
              const fatherId =
                member.fatherId
                  .toString();

              const fatherMember =
                memberMap.get(
                  fatherId,
                );

              edges.push({
                id:
                  `father-${fatherId}-${memberId}`,

                source:
                  fatherId,

                target:
                  memberId,

                relationType:
                  FamilyEdgeType.PARENT,

                parentType:
                  "FATHER",

                ...(fatherMember && {
                  sourceRelation:
                    fatherMember.relation,
                }),

                targetRelation:
                  member.relation,
              });
            }

            if (
              member.motherId &&
              memberIdSet.has(
                member.motherId
                  .toString(),
              )
            ) {
              const motherId =
                member.motherId
                  .toString();

              const motherMember =
                memberMap.get(
                  motherId,
                );

              edges.push({
                id:
                  `mother-${motherId}-${memberId}`,

                source:
                  motherId,

                target:
                  memberId,

                relationType:
                  FamilyEdgeType.PARENT,

                parentType:
                  "MOTHER",

                ...(motherMember && {
                  sourceRelation:
                    motherMember.relation,
                }),

                targetRelation:
                  member.relation,
              });
            }

            for (
              const spouseObjectId
              of member.spouseIds ??
              []
            ) {
              const spouseId =
                spouseObjectId
                  .toString();

              if (
                !memberIdSet.has(
                  spouseId,
                )
              ) {
                continue;
              }

              const [
                source,
                target,
              ]:
                [
                  string,
                  string,
                ] =
                memberId <
                  spouseId
                  ? [
                    memberId,
                    spouseId,
                  ]
                  : [
                    spouseId,
                    memberId,
                  ];

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
                memberMap.get(
                  source,
                );

              const targetMember =
                memberMap.get(
                  target,
                );

              edges.push({
                id:
                  `marriage-${marriageKey}`,

                source,

                target,

                relationType:
                  FamilyEdgeType.MARRIAGE,

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

          const nodes =
            members.map(
              (
                member,
              ) => ({
                id:
                  member._id
                    .toString(),

                data: {
                  fullName:
                    member.fullName,

                  relation:
                    member.relation,

                  gender:
                    member.gender,

                  dob:
                    member.dob,

                  lifeStatus:
                    member.lifeStatus,

                  dateOfDeath:
                    member.dateOfDeath,

                  fatherId:
                    member.fatherId
                      ?.toString() ??
                    null,

                  motherId:
                    member.motherId
                      ?.toString() ??
                    null,

                  spouseIds:
                    (
                      member.spouseIds ??
                      []
                    ).map(
                      (
                        spouseId,
                      ) =>
                        spouseId
                          .toString(),
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

                  audit: {
                    createdAt:
                      member.createdAt,

                    createdBy:
                      member.createdBy,

                    updatedAt:
                      member.updatedAt,

                    updatedBy:
                      member.updatedBy,

                    source:
                      member.source,

                    bookingId:
                      member.sourceBookingId,

                    bookingReference:
                      member
                        .sourceBookingReference,
                  },
                },
              }),
            );

          const rootMembers =
            members
              .filter(
                (
                  member,
                ) => {
                  const hasValidFather =
                    Boolean(
                      member.fatherId &&
                      memberIdSet.has(
                        member.fatherId
                          .toString(),
                      ),
                    );

                  const hasValidMother =
                    Boolean(
                      member.motherId &&
                      memberIdSet.has(
                        member.motherId
                          .toString(),
                      ),
                    );

                  return (
                    !hasValidFather &&
                    !hasValidMother
                  );
                },
              )
              .map(
                (
                  member,
                ) => ({
                  id:
                    member._id
                      .toString(),

                  fullName:
                    member.fullName,

                  relation:
                    member.relation,
                }),
              );

          return {
            nodes,
            edges,
            rootMembers,

            totalMembers:
              nodes.length,
          };
        },
    });
  }

  static async getFamilyMembers(ownerId: string, query: GetFamilyMembersQuery) {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    const {
      search,
      relation,
      gender,
      lifeStatus,
      page = 1,
      limit = 20,
    } = query;

    const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;

    const limitNumber =
      Number.isInteger(limit) && limit > 0 ? Math.min(100, limit) : 20;

    const skip = (pageNumber - 1) * limitNumber;

    const filter: QueryFilter<IFamilyMember> = {
      ownerId: new Types.ObjectId(ownerId),

      isDeleted: false,
    };

    if (search?.trim()) {
      filter.fullName = {
        $regex: FamilyTreeService.escapeRegex(search.trim()),

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

    const cacheKey =
      CacheKeys.familyMemberList(
        ownerId,
        {
          search,
          relation,
          gender,
          lifeStatus,

          page:
            pageNumber,

          limit:
            limitNumber,
        },
      );

    return RedisCacheService.getOrSet({
      key:
        cacheKey,

      ttlSeconds:
        CACHE_TTL_SECONDS
          .FAMILY_MEMBER_LIST,

      loader:
        async () => {

          const [familyMembers, totalMembers] = await Promise.all([
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
                  "createdBy",
                  "updatedBy",
                  "source",
                  "sourceBookingId",
                  "sourceBookingReference",
                  "createdAt",
                  "updatedAt",
                ].join(" "),
              )
              .populate({
                path: "fatherId",
                select: FAMILY_MEMBER_POPULATE_SELECT,
                match: {
                  isDeleted: false,
                },
              })
              .populate({
                path: "motherId",
                select: FAMILY_MEMBER_POPULATE_SELECT,
                match: {
                  isDeleted: false,
                },
              })
              .populate({
                path: "spouseIds",
                select: FAMILY_MEMBER_POPULATE_SELECT,
                match: {
                  isDeleted: false,
                },
              })
              .sort({
                createdAt: -1,
              })
              .skip(skip)
              .limit(limitNumber)
              .lean(),

            FamilyMember.countDocuments(filter),
          ]);

          const totalPages = Math.ceil(totalMembers / limitNumber);

          return {
            familyMembers,
            pagination: {
              currentPage: pageNumber,

              totalPages,

              totalMembers,

              limit: limitNumber,

              hasNextPage: pageNumber < totalPages,

              hasPreviousPage: pageNumber > 1,
            },
          };
        },
    });
  }

  static async getFamilyMemberById(ownerId: string, familyMemberId: string) {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    if (!Types.ObjectId.isValid(familyMemberId)) {
      throw new Error("Invalid family member ID");
    }

    const familyMember = await FamilyMember.findOne({
      _id: new Types.ObjectId(familyMemberId),

      ownerId: new Types.ObjectId(ownerId),

      isDeleted: false,
    })
      .populate({
        path: "fatherId",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: {
          isDeleted: false,
        },
      })
      .populate({
        path: "motherId",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: {
          isDeleted: false,
        },
      })
      .populate({
        path: "spouseIds",
        select: FAMILY_MEMBER_POPULATE_SELECT,
        match: {
          isDeleted: false,
        },
      })
      .lean();

    if (!familyMember) {
      throw new Error("Family member not found");
    }

    return RedisCacheService.getOrSet({
      key:
        CacheKeys.familyMemberDetail(
          ownerId,
          familyMemberId,
        ),

      ttlSeconds:
        CACHE_TTL_SECONDS
          .FAMILY_MEMBER_DETAIL,

      loader:
        async () => {
          const children = await FamilyMember.find({
            ownerId: new Types.ObjectId(ownerId),

            isDeleted: false,

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

            audit: {
              createdAt: familyMember.createdAt,

              createdBy: familyMember.createdBy,

              updatedAt: familyMember.updatedAt,

              updatedBy: familyMember.updatedBy,

              source: familyMember.source,

              bookingId: familyMember.sourceBookingId,

              bookingReference: familyMember.sourceBookingReference,
            },
          };
        },
    });
  }

  static async updateFamilyMember(
    context: FamilyTreeActorContext,
    familyMemberId: string,
    payload: UpdateFamilyMemberPayload,
  ) {
    FamilyTreeService.validateContext(context);

    if (!Types.ObjectId.isValid(familyMemberId)) {
      throw new Error("Invalid family member ID");
    }

    const session = await mongoose.startSession();

    session.startTransaction();

    try {
      const existingMember = await FamilyMember.findOne({
        _id: new Types.ObjectId(familyMemberId),

        ownerId: new Types.ObjectId(context.ownerId),

        isDeleted: false,
      }).session(session);

      if (!existingMember) {
        throw new Error("Family member not found");
      }

      const finalFatherId =
        payload.fatherId !== undefined
          ? payload.fatherId
          : (existingMember.fatherId?.toString() ?? null);

      const finalMotherId =
        payload.motherId !== undefined
          ? payload.motherId
          : (existingMember.motherId?.toString() ?? null);

      FamilyTreeService.validateParentRelationships(
        familyMemberId,
        finalFatherId,
        finalMotherId,
      );

      let uniqueSpouseIds: string[] | undefined;

      if (payload.spouseIds !== undefined) {
        uniqueSpouseIds = FamilyTreeService.getUniqueIds(payload.spouseIds);

        if (uniqueSpouseIds.includes(familyMemberId)) {
          throw new Error("A family member cannot be their own spouse");
        }
      }

      await FamilyTreeService.verifyFamilyMemberIds(
        context.ownerId,
        [finalFatherId, finalMotherId, ...(uniqueSpouseIds ?? [])],
        session,
      );

      const finalLifeStatus = payload.lifeStatus ?? existingMember.lifeStatus;

      let finalDateOfDeath: Date | null | undefined;

      if (payload.lifeStatus === MemberLifeStatus.ALIVE) {
        finalDateOfDeath = null;
      } else if (payload.dateOfDeath !== undefined) {
        finalDateOfDeath = payload.dateOfDeath;
      } else {
        finalDateOfDeath = existingMember.dateOfDeath;
      }

      const finalDob =
        payload.dob !== undefined ? payload.dob : existingMember.dob;

      FamilyTreeService.validateLifeStatus(
        finalLifeStatus,
        finalDateOfDeath,
        finalDob,
      );

      const updateData: Record<string, unknown> = {};

      const normalFields: Array<keyof UpdateFamilyMemberPayload> = [
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
          updateData[field] = payload[field];
        }
      }

      if (payload.dob !== undefined) {
        updateData.dob = payload.dob ?? null;
      }

      if (payload.lifeStatus !== undefined) {
        updateData.lifeStatus = payload.lifeStatus;
      }

      if (payload.lifeStatus === MemberLifeStatus.ALIVE) {
        updateData.dateOfDeath = null;
      } else if (payload.dateOfDeath !== undefined) {
        updateData.dateOfDeath = payload.dateOfDeath ?? null;
      }

      if (payload.fatherId !== undefined) {
        updateData.fatherId = payload.fatherId
          ? new Types.ObjectId(payload.fatherId)
          : null;
      }

      if (payload.motherId !== undefined) {
        updateData.motherId = payload.motherId
          ? new Types.ObjectId(payload.motherId)
          : null;
      }

      if (payload.caste !== undefined) {
        updateData.caste = payload.caste ?? null;
      }

      if (payload.gotra !== undefined) {
        updateData.gotra = payload.gotra ?? null;
      }

      const previousSpouseIds = existingMember.spouseIds.map((spouseId) =>
        spouseId.toString(),
      );

      if (uniqueSpouseIds !== undefined) {
        updateData.spouseIds = uniqueSpouseIds.map(
          (id) => new Types.ObjectId(id),
        );

        const removedSpouseIds = previousSpouseIds.filter(
          (spouseId) => !uniqueSpouseIds!.includes(spouseId),
        );

        const addedSpouseIds = uniqueSpouseIds.filter(
          (spouseId) => !previousSpouseIds.includes(spouseId),
        );

        if (removedSpouseIds.length > 0) {
          await FamilyMember.updateMany(
            {
              _id: {
                $in: removedSpouseIds.map((id) => new Types.ObjectId(id)),
              },

              ownerId: new Types.ObjectId(context.ownerId),

              isDeleted: false,
            },
            {
              $pull: {
                spouseIds: existingMember._id,
              },

              $set: {
                updatedBy: new Types.ObjectId(context.actorId),
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
                $in: addedSpouseIds.map((id) => new Types.ObjectId(id)),
              },

              ownerId: new Types.ObjectId(context.ownerId),

              isDeleted: false,
            },
            {
              $addToSet: {
                spouseIds: existingMember._id,
              },

              $set: {
                updatedBy: new Types.ObjectId(context.actorId),
              },
            },
            {
              session,
            },
          );
        }
      }

      const changes = FamilyTreeService.buildChanges(
        existingMember,
        updateData,
      );

      if (changes.length === 0) {
        await session.abortTransaction();

        return FamilyTreeService.populateMember(
          context.ownerId,
          familyMemberId,
        );
      }

      updateData.updatedBy = new Types.ObjectId(context.actorId);

      await FamilyMember.updateOne(
        {
          _id: existingMember._id,

          ownerId: new Types.ObjectId(context.ownerId),

          isDeleted: false,
        },
        {
          $set: updateData,
        },
        {
          session,
          runValidators: true,
        },
      );

      await FamilyTreeService.createActivity(
        context,
        existingMember._id,
        "MEMBER_UPDATED",
        changes,
        session,
      );

      if (FamilyTreeService.shouldNotifyOwner(context)) {
        await OutboxService.createEvent({
          eventType: DOMAIN_EVENTS.FAMILY_TREE_MEMBER_UPDATED,
          aggregateType: "FAMILY_MEMBER",
          aggregateId: existingMember._id.toString(),
          payload: {
            ownerId: context.ownerId,
            familyMemberId: existingMember._id.toString(),
            fullName:
              typeof updateData.fullName === "string"
                ? updateData.fullName
                : existingMember.fullName,
            changedFields: changes.map((change) => change.field),
            performedByRole: context.actorRole,
            source: context.source,
            ...(context.bookingId && {
              bookingId: context.bookingId,
            }),
            ...(context.bookingReference && {
              bookingReference: context.bookingReference,
            }),
          },
          session,
        });
      }

      await session.commitTransaction();

      await this.invalidateFamilyTreeCache(
        context.ownerId,
      );

      return FamilyTreeService.populateMember(context.ownerId, familyMemberId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async deleteFamilyMember(
    context: FamilyTreeActorContext,
    familyMemberId: string,
    reason: string,
  ) {
    FamilyTreeService.validateContext(context);

    if (!Types.ObjectId.isValid(familyMemberId)) {
      throw new Error("Invalid family member ID");
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error("Deletion reason is required");
    }

    const session = await mongoose.startSession();

    session.startTransaction();

    try {
      const familyMember = await FamilyMember.findOne({
        _id: new Types.ObjectId(familyMemberId),

        ownerId: new Types.ObjectId(context.ownerId),

        isDeleted: false,
      }).session(session);

      if (!familyMember) {
        throw new Error("Family member not found");
      }

      /*
       * This is a soft delete. Keep relationship references
       * intact so restoration can fully recover the tree.
       * Read queries hide deleted related members.
       */

      familyMember.isDeleted = true;

      familyMember.deletedAt = new Date();

      familyMember.deletedBy = new Types.ObjectId(context.actorId);

      familyMember.deletionReason = reason.trim();

      familyMember.updatedBy = new Types.ObjectId(context.actorId);

      await familyMember.save({
        session,
      });

      await FamilyTreeService.createActivity(
        context,
        familyMember._id,
        "MEMBER_DELETED",
        [
          {
            field: "isDeleted",
            oldValue: false,
            newValue: true,
          },
        ],
        session,
        {
          reason: reason.trim(),

          metadata: {
            fullName: familyMember.fullName,

            relation: familyMember.relation,
          },
        },
      );

      if (FamilyTreeService.shouldNotifyOwner(context)) {
        await OutboxService.createEvent({
          eventType: DOMAIN_EVENTS.FAMILY_TREE_MEMBER_DELETED,
          aggregateType: "FAMILY_MEMBER",
          aggregateId: familyMember._id.toString(),
          payload: {
            ownerId: context.ownerId,
            familyMemberId: familyMember._id.toString(),
            fullName: familyMember.fullName,
            relation: familyMember.relation,
            reason: reason.trim(),
            performedByRole: context.actorRole,
            source: context.source,
            ...(context.bookingId && {
              bookingId: context.bookingId,
            }),
            ...(context.bookingReference && {
              bookingReference: context.bookingReference,
            }),
          },
          session,
        });
      }

      await session.commitTransaction();

      await this.invalidateFamilyTreeCache(
        context.ownerId,
      );

      return {
        id: familyMember._id,

        fullName: familyMember.fullName,

        deletedAt: familyMember.deletedAt,

        deletedBy: familyMember.deletedBy,

        reason: familyMember.deletionReason,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getFamilyTreeActivities(
    ownerId: string,
    query: GetFamilyTreeActivitiesQuery,
  ) {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    const {
      action,
      familyMemberId,
      performedBy,
      bookingId,
      page = 1,
      limit = 20,
    } = query;

    const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;

    const limitNumber =
      Number.isInteger(limit) && limit > 0 ? Math.min(100, limit) : 20;

    const skip = (pageNumber - 1) * limitNumber;

    const filter: Record<string, unknown> = {
      ownerId: new Types.ObjectId(ownerId),
    };

    if (action) {
      filter.action = action;
    }

    if (familyMemberId) {
      if (!Types.ObjectId.isValid(familyMemberId)) {
        throw new Error("Invalid family member ID");
      }

      filter.familyMemberId = new Types.ObjectId(familyMemberId);
    }

    if (performedBy) {
      if (!Types.ObjectId.isValid(performedBy)) {
        throw new Error("Invalid performed-by user ID");
      }

      filter.performedBy = new Types.ObjectId(performedBy);
    }

    if (bookingId) {
      if (!Types.ObjectId.isValid(bookingId)) {
        throw new Error("Invalid booking ID");
      }

      filter.bookingId = new Types.ObjectId(bookingId);
    }

    const [activities, totalActivities] = await Promise.all([
      FamilyTreeActivity.find(filter)
        .populate(
          "familyMemberId",
          "fullName relation gender lifeStatus profileImage isDeleted",
        )
        .populate("performedBy", "fullName role userReference profileImage")
        .populate("bookingId", "bookingReference status")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      FamilyTreeActivity.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalActivities / limitNumber);

    return {
      activities,

      pagination: {
        currentPage: pageNumber,

        totalPages,

        totalActivities,

        limit: limitNumber,

        hasNextPage: pageNumber < totalPages,

        hasPreviousPage: pageNumber > 1,
      },
    };
  }

  static async getFamilyMemberActivities(
    ownerId: string,
    familyMemberId: string,
    query: GetFamilyMemberActivitiesQuery,
  ) {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    if (!Types.ObjectId.isValid(familyMemberId)) {
      throw new Error("Invalid family member ID");
    }

    const { page = 1, limit = 20 } = query;

    const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;

    const limitNumber =
      Number.isInteger(limit) && limit > 0 ? Math.min(100, limit) : 20;

    const skip = (pageNumber - 1) * limitNumber;

    /*
     * Important:
     * Do not filter FamilyMember by isDeleted here.
     * A deleted member must still have an accessible
     * audit timeline.
     */
    const familyMember = await FamilyMember.findOne({
      _id: new Types.ObjectId(familyMemberId),

      ownerId: new Types.ObjectId(ownerId),
    })
      .select(
        "fullName relation gender lifeStatus profileImage isDeleted deletedAt deletionReason",
      )
      .lean();

    if (!familyMember) {
      throw new Error("Family member not found");
    }

    const filter = {
      ownerId: new Types.ObjectId(ownerId),

      familyMemberId: new Types.ObjectId(familyMemberId),
    };

    const [activities, totalActivities] = await Promise.all([
      FamilyTreeActivity.find(filter)
        .populate("performedBy", "fullName role userReference profileImage")
        .populate("bookingId", "bookingReference status")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      FamilyTreeActivity.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalActivities / limitNumber);

    return {
      familyMember,

      activities,

      pagination: {
        currentPage: pageNumber,

        totalPages,

        totalActivities,

        limit: limitNumber,

        hasNextPage: pageNumber < totalPages,

        hasPreviousPage: pageNumber > 1,
      },
    };
  }

  static async restoreFamilyMember(
    context: FamilyTreeActorContext,
    familyMemberId: string,
    reason?: string,
  ) {
    const { ownerId, actorId, actorRole, source, bookingId, bookingReference } =
      context;

    if (!Types.ObjectId.isValid(ownerId)) {
      throw new Error("Invalid family tree owner ID");
    }

    if (!Types.ObjectId.isValid(actorId)) {
      throw new Error("Invalid actor ID");
    }

    if (!Types.ObjectId.isValid(familyMemberId)) {
      throw new Error("Invalid family member ID");
    }

    if (bookingId && !Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }

    const session = await mongoose.startSession();

    try {
      let restoredMember: Awaited<
        ReturnType<typeof FamilyMember.findOne>
      > | null = null;

      await session.withTransaction(async () => {
        const member = await FamilyMember.findOne({
          _id: new Types.ObjectId(familyMemberId),

          ownerId: new Types.ObjectId(ownerId),
        }).session(session);

        if (!member) {
          throw new Error("Family member not found");
        }

        if (!member.isDeleted) {
          throw new Error("Family member is not deleted");
        }

        const previousDeletionState = {
          isDeleted: member.isDeleted,

          deletedAt: member.deletedAt ?? null,

          deletedBy: member.deletedBy ?? null,

          deletionReason: member.deletionReason ?? null,
        };

        member.isDeleted = false;
        member.deletedAt = null;
        member.deletedBy = null;
        member.deletionReason = null;
        member.updatedBy = new Types.ObjectId(actorId);

        await member.save({
          session,
        });

        await FamilyTreeService.createActivity(
          context,
          member._id,
          "MEMBER_RESTORED",
          [
            {
              field: "isDeleted",
              oldValue: previousDeletionState.isDeleted,
              newValue: false,
            },
            {
              field: "deletedAt",
              oldValue: previousDeletionState.deletedAt,
              newValue: null,
            },
            {
              field: "deletedBy",
              oldValue: previousDeletionState.deletedBy,
              newValue: null,
            },
            {
              field: "deletionReason",
              oldValue: previousDeletionState.deletionReason,
              newValue: null,
            },
          ],
          session,
          {
            metadata: {
              ...(reason && {
                restoreReason: reason,
              }),
            },
          },
        );

        if (FamilyTreeService.shouldNotifyOwner(context)) {
          await OutboxService.createEvent({
            eventType: DOMAIN_EVENTS.FAMILY_TREE_MEMBER_RESTORED,
            aggregateType: "FAMILY_MEMBER",
            aggregateId: member._id.toString(),
            payload: {
              ownerId: context.ownerId,
              familyMemberId: member._id.toString(),
              fullName: member.fullName,
              relation: member.relation,
              performedByRole: context.actorRole,
              source: context.source,
              ...(reason?.trim() && {
                reason: reason.trim(),
              }),
              ...(context.bookingId && {
                bookingId: context.bookingId,
              }),
              ...(context.bookingReference && {
                bookingReference: context.bookingReference,
              }),
            },
            session,
          });
        }

        restoredMember = await FamilyMember.findById(member._id)
          .populate("createdBy", "fullName role profileImage")
          .populate("updatedBy", "fullName role profileImage")
          .populate({
            path: "fatherId",
            select: "fullName relation gender lifeStatus profileImage",
            match: {
              isDeleted: false,
            },
          })
          .populate({
            path: "motherId",
            select: "fullName relation gender lifeStatus profileImage",
            match: {
              isDeleted: false,
            },
          })
          .populate({
            path: "spouseIds",
            select: "fullName relation gender lifeStatus profileImage",
            match: {
              isDeleted: false,
            },
          })
          .session(session);
      });

      if (!restoredMember) {
        throw new Error("Failed to restore family member");
      }

      await this.invalidateFamilyTreeCache(
        ownerId,
      );

      return restoredMember;
    } finally {
      await session.endSession();
    }
  }

  static async exportFamilyMembersToCsv(
    ownerId: string,
    memberIds: string[],
  ) {
    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new Error(
        "Invalid family tree owner ID",
      );
    }

    if (
      !Array.isArray(
        memberIds,
      ) ||
      memberIds.length ===
      0
    ) {
      throw new Error(
        "At least one family member ID is required",
      );
    }

    if (
      memberIds.length >
      1000
    ) {
      throw new Error(
        "A maximum of 1000 family members can be exported at once",
      );
    }

    const uniqueMemberIds = [
      ...new Set(
        memberIds,
      ),
    ];

    for (
      const memberId of
      uniqueMemberIds
    ) {
      if (
        !Types.ObjectId.isValid(
          memberId,
        )
      ) {
        throw new Error(
          "Invalid family member ID",
        );
      }
    }

    const ownerObjectId =
      new Types.ObjectId(
        ownerId,
      );

    const memberObjectIds =
      uniqueMemberIds.map(
        (
          memberId,
        ) =>
          new Types.ObjectId(
            memberId,
          ),
      );

    /*
     * IMPORTANT:
     *
     * ownerId is included in the query.
     *
     * Therefore even if a caller somehow provides
     * another user's valid family-member ObjectId,
     * that member cannot be exported.
     */
    const members =
      await FamilyMember.find({
        _id: {
          $in:
            memberObjectIds,
        },

        ownerId:
          ownerObjectId,

        isDeleted:
          false,
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
            "source",
            "sourceBookingId",
            "sourceBookingReference",
            "createdBy",
            "updatedBy",
            "createdAt",
            "updatedAt",
          ].join(
            " ",
          ),
        )
        .populate({
          path:
            "fatherId",

          select:
            "fullName relation",
        })
        .populate({
          path:
            "motherId",

          select:
            "fullName relation",
        })
        .populate({
          path:
            "spouseIds",

          select:
            "fullName relation",
        })
        .populate({
          path:
            "createdBy",

          select:
            "fullName role userReference",
        })
        .populate({
          path:
            "updatedBy",

          select:
            "fullName role userReference",
        })
        .lean();

    if (
      members.length ===
      0
    ) {
      throw new Error(
        "No family members found for export",
      );
    }

    /*
     * Keep CSV rows in the same order
     * as IDs received from frontend.
     */
    const memberMap =
      new Map(
        members.map(
          (
            member,
          ) => [
              member._id
                .toString(),

              member,
            ],
        ),
      );

    const orderedMembers =
      uniqueMemberIds
        .map(
          (
            memberId,
          ) =>
            memberMap.get(
              memberId,
            ),
        )
        .filter(
          (
            member,
          ): member is NonNullable<
            typeof member
          > =>
            Boolean(
              member,
            ),
        );

    const escapeCsv = (
      value: unknown,
    ): string => {
      if (
        value ===
        null ||
        value ===
        undefined
      ) {
        return "";
      }

      const stringValue =
        String(
          value,
        );

      /*
       * Prevent CSV formula injection when the
       * generated file is opened in Excel /
       * Google Sheets.
       */
      const safeValue =
        /^[=+\-@]/.test(
          stringValue,
        )
          ? `'${stringValue}`
          : stringValue;

      if (
        safeValue.includes(
          ",",
        ) ||
        safeValue.includes(
          '"',
        ) ||
        safeValue.includes(
          "\n",
        ) ||
        safeValue.includes(
          "\r",
        )
      ) {
        return `"${safeValue.replace(
          /"/g,
          '""',
        )}"`;
      }

      return safeValue;
    };

    const formatDate = (
      value:
        Date |
        string |
        null |
        undefined,
    ): string => {
      if (!value) {
        return "";
      }

      const date =
        new Date(
          value,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return "";
      }

      return date
        .toISOString();
    };

    const getPopulatedName = (
      value: unknown,
    ): string => {
      if (
        !value ||
        typeof value !==
        "object"
      ) {
        return "";
      }

      if (
        "fullName" in
        value &&
        typeof value.fullName ===
        "string"
      ) {
        return value.fullName;
      }

      return "";
    };

    const getActorName = (
      value: unknown,
    ): string => {
      if (
        !value ||
        typeof value !==
        "object"
      ) {
        return "";
      }

      if (
        "fullName" in
        value &&
        typeof value.fullName ===
        "string"
      ) {
        return value.fullName;
      }

      return "";
    };

    const headers = [
      "Member ID",
      "Full Name",
      "Relation",
      "Gender",
      "Date Of Birth",
      "Life Status",
      "Date Of Death",
      "Father",
      "Mother",
      "Spouses",
      "Native Village",
      "State",
      "District",
      "Caste",
      "Gotra",
      "Designated Pandit",
      "Visitors",
      "Profile Image",
      "Notes",
      "Source",
      "Booking Reference",
      "Created By",
      "Updated By",
      "Created At",
      "Updated At",
    ];

    const rows =
      orderedMembers.map(
        (
          member,
        ) => {
          const spouseNames =
            Array.isArray(
              member.spouseIds,
            )
              ? member.spouseIds
                .map(
                  (
                    spouse,
                  ) =>
                    getPopulatedName(
                      spouse,
                    ),
                )
                .filter(
                  Boolean,
                )
                .join(
                  " | ",
                )
              : "";

          const visitors =
            Array.isArray(
              member.visitors,
            )
              ? member.visitors
                .filter(
                  Boolean,
                )
                .join(
                  " | ",
                )
              : "";

          return [
            member._id
              .toString(),

            member.fullName,

            member.relation,

            member.gender ??
            "",

            formatDate(
              member.dob,
            ),

            member.lifeStatus,

            formatDate(
              member.dateOfDeath,
            ),

            getPopulatedName(
              member.fatherId,
            ),

            getPopulatedName(
              member.motherId,
            ),

            spouseNames,

            member.nativeVillage ??
            "",

            member.state ??
            "",

            member.district ??
            "",

            member.caste ??
            "",

            member.gotra ??
            "",

            member.designatedPandit ??
            "",

            visitors,

            member.profileImage ??
            "",

            member.notes ??
            "",

            member.source,

            member.sourceBookingReference ??
            "",

            getActorName(
              member.createdBy,
            ),

            getActorName(
              member.updatedBy,
            ),

            formatDate(
              member.createdAt,
            ),

            formatDate(
              member.updatedAt,
            ),
          ];
        },
      );

    const csv = [
      headers
        .map(
          escapeCsv,
        )
        .join(
          ",",
        ),

      ...rows.map(
        (
          row,
        ) =>
          row
            .map(
              escapeCsv,
            )
            .join(
              ",",
            ),
      ),
    ].join(
      "\n",
    );

    return {
      csv,

      total:
        orderedMembers.length,
    };
  }
}

export default FamilyTreeService;
