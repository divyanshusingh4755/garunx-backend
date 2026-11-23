import type { Request, Response } from "express";
import { FamilyTreeAccessRequestService } from "../services/family-tree-access-request.service.js";

const authenticatedId = (req: Request): string => {
    const id = req.user?.userId;
    if (!id) throw new Error("Unauthorized");
    return id;
};

const requiredParam = (value: string | string[] | undefined, name: string): string => {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${name} is required`);
    }
    return value.trim();
};

const sendError = (res: Response, error: unknown) => {
    const message = error instanceof Error ? error.message : "Request failed";
    const lower = message.toLowerCase();
    const status = lower === "unauthorized" ? 401 : lower.includes("access denied") || lower.includes("not intended") || lower.includes("not authorized") ? 403 : lower.includes("not found") ? 404 : 400;

    return res.status(status).json({
        success: false,
        message,
    });
};

export const createFamilyTreeInvitation = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.createInvitation(
            authenticatedId(req),
            requiredParam(req.body.familyMemberId, "familyMemberId"),
            {
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
            },
        );

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const validateFamilyTreeInvitation = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.validateInvitation(requiredParam(req.params.token, "invitation token"));

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const acceptFamilyTreeInvitation = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.acceptInvitation(authenticatedId(req), requiredParam(req.body.invitationToken, "invitationToken"));

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const requestFamilyTreeJoin = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.requestToJoin(
            authenticatedId(req),
            requiredParam(req.body.treeOwnerId, "treeOwnerId"),
            requiredParam(req.body.familyMemberId, "familyMemberId"),
        );

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const getPendingFamilyTreeJoinRequests = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.getPendingRequests(authenticatedId(req));

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const decideFamilyTreeJoinRequest = async (req: Request, res: Response) => {
    try {
        const requestId = requiredParam(req.params.requestId, "requestId");
        const decision = req.body.decision;
        const familyMemberId = typeof req.body.familyMemberId === "string" && req.body.familyMemberId.trim() ? req.body.familyMemberId.trim() : undefined;

        const result = await FamilyTreeAccessRequestService.decideJoinRequest(
            authenticatedId(req),
            requestId,
            decision,
            familyMemberId,
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const activateFamilyTreeJoinRequest = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.activateApprovedJoinRequest(authenticatedId(req), requiredParam(req.params.requestId, "requestId"));

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

export const requestDiscoveredFamilyTreeJoin = async (req: Request, res: Response) => {
    try {
        const result = await FamilyTreeAccessRequestService.requestToJoinDiscoveredTree(authenticatedId(req), requiredParam(req.body.discoveryToken, "discoveryToken"));

        return res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return sendError(res, error);
    }
};

