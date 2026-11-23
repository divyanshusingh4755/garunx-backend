import { FamilyTreeAccessRequestService } from "../services/family-tree-access-request.service.js";
const authenticatedId = (req) => {
    const id = req.user?.userId;
    if (!id)
        throw new Error("Unauthorized");
    return id;
};
const requiredParam = (value, name) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${name} is required`);
    }
    return value.trim();
};
const sendError = (res, error) => {
    const message = error instanceof Error ? error.message : "Request failed";
    const lower = message.toLowerCase();
    const status = lower === "unauthorized" ? 401 : lower.includes("access denied") || lower.includes("not intended") || lower.includes("not authorized") ? 403 : lower.includes("not found") ? 404 : 400;
    return res.status(status).json({
        success: false,
        message,
    });
};
export const createFamilyTreeInvitation = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.createInvitation(authenticatedId(req), requiredParam(req.body.familyMemberId, "familyMemberId"), {
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
        });
        return res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const validateFamilyTreeInvitation = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.validateInvitation(requiredParam(req.params.token, "invitation token"));
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const acceptFamilyTreeInvitation = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.acceptInvitation(authenticatedId(req), requiredParam(req.body.invitationToken, "invitationToken"));
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const requestFamilyTreeJoin = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.requestToJoin(authenticatedId(req), requiredParam(req.body.treeOwnerId, "treeOwnerId"), requiredParam(req.body.familyMemberId, "familyMemberId"));
        return res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const getPendingFamilyTreeJoinRequests = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.getPendingRequests(authenticatedId(req));
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const decideFamilyTreeJoinRequest = async (req, res) => {
    try {
        const requestId = requiredParam(req.params.requestId, "requestId");
        const decision = req.body.decision;
        const familyMemberId = typeof req.body.familyMemberId === "string" && req.body.familyMemberId.trim() ? req.body.familyMemberId.trim() : undefined;
        const result = await FamilyTreeAccessRequestService.decideJoinRequest(authenticatedId(req), requestId, decision, familyMemberId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const activateFamilyTreeJoinRequest = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.activateApprovedJoinRequest(authenticatedId(req), requiredParam(req.params.requestId, "requestId"));
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
export const requestDiscoveredFamilyTreeJoin = async (req, res) => {
    try {
        const result = await FamilyTreeAccessRequestService.requestToJoinDiscoveredTree(authenticatedId(req), requiredParam(req.body.discoveryToken, "discoveryToken"));
        return res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return sendError(res, error);
    }
};
//# sourceMappingURL=family-tree-access-request.controller.js.map