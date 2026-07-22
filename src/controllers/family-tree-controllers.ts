import type { Request, Response } from "express";

import FamilyTreeService, { type GetFamilyMembersQuery } from "../services/family-tree.service.js";

import {
    FamilyRelation,
    Gender,
    MemberLifeStatus,
} from "../types/enums.js";
import { resolveFamilyTreeOwnerId } from "../services/access.service.js";

interface AuthenticatedUser {
    userId: string;
    role?: string;
}

const getAuthenticatedUser = (
    req: Request,
): AuthenticatedUser | null => {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
        return null;
    }

    return {
        userId,
        ...(role !== undefined && {
            role,
        }),
    };
};

const getStringParam = (
    value: string | string[] | undefined,
    fieldName: string,
): string | undefined => {
    if (Array.isArray(value)) {
        throw new Error(
            `Invalid ${fieldName}`,
        );
    }

    return value;
};

const getTreeOwnerId = async (
    req: Request,
): Promise<string> => {
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

    return resolveFamilyTreeOwnerId({
        actorId:
            authenticatedUser.userId,

        ...(authenticatedUser.role !== undefined && {
            actorRole:
                authenticatedUser.role,
        }),

        ...(requestedOwnerId !== undefined && {
            requestedOwnerId,
        }),
    });
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

    if (error.message === "Unauthorized") {
        return 401;
    }

    if (
        message.includes("not authorized") ||
        message.includes("not assigned")
    ) {
        return 403;
    }

    if (
        error.message ===
        "Family member not found" ||
        error.message ===
        "Family tree owner not found"
    ) {
        return 404;
    }

    if (
        message.includes("invalid") ||
        message.includes("required")
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
        const authenticatedUser =
            getAuthenticatedUser(req);

        if (!authenticatedUser) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const ownerId =
            await getTreeOwnerId(req);

        const actorId =
            authenticatedUser.userId;

        const familyMember =
            await FamilyTreeService.addFamilyMember(
                ownerId,
                actorId,
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
        const ownerId =
            await getTreeOwnerId(req);

        const familyTree =
            await FamilyTreeService.getFamilyTree(
                ownerId,
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
        const ownerId =
            await getTreeOwnerId(req);

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
            filters.search = search;
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
                ownerId,
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
        const ownerId =
            await getTreeOwnerId(req);

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message:
                    "Family member ID is required",
            });
        }

        const familyMember =
            await FamilyTreeService.getFamilyMemberById(
                ownerId,
                id as string,
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
        const authenticatedUser =
            getAuthenticatedUser(req);

        if (!authenticatedUser) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const ownerId =
            await getTreeOwnerId(req);

        const actorId =
            authenticatedUser.userId;

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message:
                    "Family member ID is required",
            });
        }

        const familyMember =
            await FamilyTreeService.updateFamilyMember(
                ownerId,
                actorId,
                id as string,
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
        const ownerId =
            await getTreeOwnerId(req);

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message:
                    "Family member ID is required",
            });
        }

        const deletedMember =
            await FamilyTreeService.deleteFamilyMember(
                ownerId,
                id as string,
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
                    500,
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