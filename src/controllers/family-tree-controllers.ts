import type { Request, Response } from "express";

import FamilyTreeService, {
    type FamilyTreeActorContext,
    type GetFamilyMembersQuery,
} from "../services/family-tree.service.js";

import {
    FamilyRelation,
    Gender,
    MemberLifeStatus,
} from "../types/enums.js";

import {
    resolveFamilyTreeOwnerId,
    type ResolvedFamilyTreeAccess,
} from "../services/access.service.js";

interface AuthenticatedUser {
    userId: string;
    role: string;
}

const getAuthenticatedUser = (
    req: Request,
): AuthenticatedUser | null => {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId || !role) {
        return null;
    }

    return {
        userId,
        role,
    };
};

const getStringParam = (
    value: string | string[] | undefined,
    fieldName: string,
): string | undefined => {
    if (Array.isArray(value)) {
        throw new Error(`Invalid ${fieldName}`);
    }

    return value;
};

const getRequiredStringParam = (
    value: string | string[] | undefined,
    fieldName: string,
): string => {
    const parsedValue = getStringParam(
        value,
        fieldName,
    );

    if (!parsedValue?.trim()) {
        throw new Error(`${fieldName} is required`);
    }

    return parsedValue.trim();
};

const getSourceFromRole = (
    role: string,
): FamilyTreeActorContext["source"] => {
    const normalizedRole = role
        .trim()
        .toUpperCase();

    switch (normalizedRole) {
        case "CUSTOMER":
        case "USER":
            return "CUSTOMER_SELF";

        case "COORDINATOR":
            return "COORDINATOR_BOOKING";

        case "ADMIN":
        case "SUPER_ADMIN":
            return "ADMIN_MANUAL";

        default:
            throw new Error(
                "Role is not authorized to modify a family tree",
            );
    }
};

const resolveTreeAccess = async (
    req: Request,
): Promise<{
    authenticatedUser: AuthenticatedUser;
    access: ResolvedFamilyTreeAccess;
}> => {
    const authenticatedUser =
        getAuthenticatedUser(req);

    if (!authenticatedUser) {
        throw new Error("Unauthorized");
    }

    const requestedOwnerId =
        getStringParam(
            req.params.ownerId,
            "family tree owner ID",
        );

    const access =
        await resolveFamilyTreeOwnerId({
            actorId:
                authenticatedUser.userId,

            actorRole:
                authenticatedUser.role,

            ...(requestedOwnerId && {
                requestedOwnerId,
            }),
        });

    return {
        authenticatedUser,
        access,
    };
};

const buildActorContext = (
    authenticatedUser: AuthenticatedUser,
    access: ResolvedFamilyTreeAccess,
): FamilyTreeActorContext => {
    return {
        ownerId: access.ownerId,

        actorId:
            authenticatedUser.userId,

        actorRole:
            authenticatedUser.role,

        source:
            getSourceFromRole(
                authenticatedUser.role,
            ),

        ...(access.bookingId && {
            bookingId:
                access.bookingId,
        }),

        ...(access.bookingReference && {
            bookingReference:
                access.bookingReference,
        }),
    };
};

const getErrorStatusCode = (
    error: unknown,
    defaultStatusCode = 400,
): number => {
    if (!(error instanceof Error)) {
        return defaultStatusCode;
    }

    const message =
        error.message.toLowerCase();

    if (message === "unauthorized") {
        return 401;
    }

    if (
        message.includes("not authorized") ||
        message.includes("not assigned") ||
        message.includes(
            "role is not authorized",
        )
    ) {
        return 403;
    }

    if (
        message.includes("not found")
    ) {
        return 404;
    }

    if (
        message.includes("invalid") ||
        message.includes("required") ||
        message.includes("cannot") ||
        message.includes("do not belong") ||
        message.includes("duplicate")
    ) {
        return 400;
    }

    return defaultStatusCode;
};

const getErrorMessage = (
    error: unknown,
    fallbackMessage: string,
): string => {
    return error instanceof Error
        ? error.message
        : fallbackMessage;
};

export const addFamilyMember = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            authenticatedUser,
            access,
        } = await resolveTreeAccess(req);

        const context =
            buildActorContext(
                authenticatedUser,
                access,
            );

        const familyMember =
            await FamilyTreeService.addFamilyMember(
                context,
                req.body,
            );

        return res.status(201).json({
            success: true,
            message:
                "Family member added successfully",
            familyMember,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    400,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to add family member",
                ),
            });
    }
};

export const getFamilyTree = async (
    req: Request,
    res: Response,
) => {
    try {
        const { access } =
            await resolveTreeAccess(req);

        const familyTree =
            await FamilyTreeService.getFamilyTree(
                access.ownerId,
            );

        return res.status(200).json({
            success: true,
            message:
                familyTree.totalMembers > 0
                    ? "Family tree fetched successfully"
                    : "No family members found",
            familyTree,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    500,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to fetch family tree",
                ),
            });
    }
};

export const getFamilyMembers = async (
    req: Request,
    res: Response,
) => {
    try {
        const { access } =
            await resolveTreeAccess(req);

        const {
            search,
            relation,
            gender,
            lifeStatus,
            page,
            limit,
        } = req.query;

        const filters: GetFamilyMembersQuery =
            {
                page:
                    typeof page === "string"
                        ? Number(page) || 1
                        : 1,

                limit:
                    typeof limit === "string"
                        ? Number(limit) || 20
                        : 20,
            };

        if (typeof search === "string") {
            filters.search =
                search.trim();
        }

        if (typeof relation === "string") {
            filters.relation =
                relation as FamilyRelation;
        }

        if (typeof gender === "string") {
            filters.gender =
                gender as Gender;
        }

        if (
            typeof lifeStatus === "string"
        ) {
            filters.lifeStatus =
                lifeStatus as MemberLifeStatus;
        }

        const result =
            await FamilyTreeService.getFamilyMembers(
                access.ownerId,
                filters,
            );

        return res.status(200).json({
            success: true,
            message:
                "Family members fetched successfully",
            ...result,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    500,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to fetch family members",
                ),
            });
    }
};

export const getFamilyMemberById = async (
    req: Request,
    res: Response,
) => {
    try {
        const { access } =
            await resolveTreeAccess(req);

        const familyMemberId =
            getRequiredStringParam(
                req.params.id,
                "Family member ID",
            );

        const familyMember =
            await FamilyTreeService.getFamilyMemberById(
                access.ownerId,
                familyMemberId,
            );

        return res.status(200).json({
            success: true,
            message:
                "Family member fetched successfully",
            familyMember,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    500,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to fetch family member",
                ),
            });
    }
};

export const updateFamilyMember = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            authenticatedUser,
            access,
        } = await resolveTreeAccess(req);

        const familyMemberId =
            getRequiredStringParam(
                req.params.id,
                "Family member ID",
            );

        const context =
            buildActorContext(
                authenticatedUser,
                access,
            );

        const familyMember =
            await FamilyTreeService.updateFamilyMember(
                context,
                familyMemberId,
                req.body,
            );

        return res.status(200).json({
            success: true,
            message:
                "Family member updated successfully",
            familyMember,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    400,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to update family member",
                ),
            });
    }
};

export const deleteFamilyMember = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            authenticatedUser,
            access,
        } = await resolveTreeAccess(req);

        const familyMemberId =
            getRequiredStringParam(
                req.params.id,
                "Family member ID",
            );

        const reason =
            typeof req.body?.reason === "string"
                ? req.body.reason.trim()
                : "";

        if (reason.length < 3) {
            return res.status(400).json({
                success: false,
                message:
                    "Deletion reason is required and must contain at least 3 characters",
            });
        }

        const context =
            buildActorContext(
                authenticatedUser,
                access,
            );

        const deletedMember =
            await FamilyTreeService.deleteFamilyMember(
                context,
                familyMemberId,
                reason,
            );

        return res.status(200).json({
            success: true,
            message:
                "Family member deleted successfully",
            deletedMember,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    400,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to delete family member",
                ),
            });
    }
};

export const getFamilyTreeActivities = async (
    req: Request,
    res: Response,
) => {
    try {
        const { access } =
            await resolveTreeAccess(req);

        const {
            action,
            familyMemberId,
            performedBy,
            bookingId,
            page,
            limit,
        } = req.query;

        const result =
            await FamilyTreeService.getFamilyTreeActivities(
                access.ownerId,
                {
                    ...(typeof action ===
                        "string" && {
                        action,
                    }),

                    ...(typeof familyMemberId ===
                        "string" && {
                        familyMemberId,
                    }),

                    ...(typeof performedBy ===
                        "string" && {
                        performedBy,
                    }),

                    ...(typeof bookingId ===
                        "string" && {
                        bookingId,
                    }),

                    page:
                        typeof page === "string"
                            ? Number(page) || 1
                            : 1,

                    limit:
                        typeof limit === "string"
                            ? Number(limit) || 20
                            : 20,
                },
            );

        return res.status(200).json({
            success: true,
            message:
                "Family tree activities fetched successfully",
            ...result,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    500,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to fetch family tree activities",
                ),
            });
    }
};

export const getFamilyMemberActivities = async (
    req: Request,
    res: Response,
) => {
    try {
        const { access } =
            await resolveTreeAccess(req);

        const familyMemberId =
            getRequiredStringParam(
                req.params.id,
                "Family member ID",
            );

        const {
            page,
            limit,
        } = req.query;

        const result =
            await FamilyTreeService.getFamilyMemberActivities(
                access.ownerId,
                familyMemberId,
                {
                    page:
                        typeof page === "string"
                            ? Number(page) || 1
                            : 1,

                    limit:
                        typeof limit === "string"
                            ? Number(limit) || 20
                            : 20,
                },
            );

        return res.status(200).json({
            success: true,
            message:
                "Family member activities fetched successfully",
            ...result,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    500,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to fetch family member activities",
                ),
            });
    }
};

export const restoreFamilyMember = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            authenticatedUser,
            access,
        } = await resolveTreeAccess(req);

        const familyMemberId =
            getRequiredStringParam(
                req.params.id,
                "Family member ID",
            );

        const reason =
            typeof req.body?.reason === "string"
                ? req.body.reason.trim()
                : undefined;

        const context =
            buildActorContext(
                authenticatedUser,
                access,
            );

        const restoredMember =
            await FamilyTreeService.restoreFamilyMember(
                context,
                familyMemberId,
                reason,
            );

        return res.status(200).json({
            success: true,
            message:
                "Family member restored successfully",
            restoredMember,
        });
    } catch (error: unknown) {
        return res
            .status(
                getErrorStatusCode(
                    error,
                    400,
                ),
            )
            .json({
                success: false,
                message: getErrorMessage(
                    error,
                    "Failed to restore family member",
                ),
            });
    }
};