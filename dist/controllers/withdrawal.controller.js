import { Role } from "../types/rbac.js";
import { WithdrawalService } from "../services/withdrawal.service.js";
const getErrorStatus = (message) => {
    if (message.includes("not found")) {
        return 404;
    }
    if (message.includes("Insufficient")) {
        return 400;
    }
    if (message.includes("cannot be") || message.includes("current status")) {
        return 409;
    }
    if (message.includes("verified") || message.includes("inactive")) {
        return 403;
    }
    return 400;
};
const parsePositiveInteger = (value, fallback, maximum) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return maximum ? Math.min(parsed, maximum) : parsed;
};
export const createWithdrawal = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found"
            });
        }
        if (role !== Role.USER && role !== Role.COORDINATOR) {
            return res.status(403).json({
                success: false,
                message: "Withdrawal is only available for USER or COORDINATOR"
            });
        }
        const data = await WithdrawalService.createWithdrawal({ ownerId: userId, ownerRole: role, amount: Number(req.body.amount) });
        return res.status(201).json({
            success: true,
            message: "Withdrawal request created successfully"
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to create withdrawal request"
        });
    }
};
export const getMyWithdrawals = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found"
            });
        }
        if (role !== Role.USER && role !== Role.COORDINATOR) {
            return res.status(403).json({
                success: false,
                message: "Withdrawal is only available for USER or COORDINATOR"
            });
        }
        const { status, page, limit } = req.query;
        const parsedPage = parsePositiveInteger(page, 1);
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const result = await WithdrawalService.getMyWithdrawals({
            ownerId: userId,
            ownerRole: role,
            ...(typeof status === "string" && status.trim() ? { statu: status.trim() } : {}),
            page: parsedPage,
            limit: parsedLimit
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.pagination.total,
            currentPage: result.pagination.page,
            totalPages: result.pagination.totalPages
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch withdrawal requests"
        });
    }
};
export const getMyWithdrawalById = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found"
            });
        }
        if (role !== Role.USER && role !== Role.COORDINATOR) {
            return res.status(403).json({
                success: false,
                message: "Withdrawal is only available for USER or COORDINATOR"
            });
        }
        const data = await WithdrawalService.getMyWithdrawalById({ withdrawalRequestId: withdrawalRequestId, ownerId: userId, ownerRole: role });
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch withdrawal request"
        });
    }
};
export const cancelWithdrawal = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found",
            });
        }
        if (role !== Role.USER && role !== Role.COORDINATOR) {
            return res.status(403).json({
                success: false,
                message: "Withdrawal is only available for USER or COORDINATOR",
            });
        }
        const data = await WithdrawalService.cancelWithdrawal({ withdrawalRequestId: withdrawalRequestId, ownerId: userId, ownerRole: role, reason: req.body.reason });
        return res.status(200).json({
            success: true,
            message: "Withdrawal request cancelled successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to cancel withdrawal request",
        });
    }
};
export const getAllWithdrawalsAdmin = async (req, res) => {
    try {
        const { status, ownerRole, ownerId, page, limit, sortOrder } = req.query;
        const parsedPage = parsePositiveInteger(page, 1);
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const validOwnerRole = ownerRole === Role.USER || ownerRole === Role.COORDINATOR ? ownerRole : undefined;
        const result = await WithdrawalService.getAllWithdrawals({
            ...(typeof status === "string" && status.trim()
                ? { status: status.trim() } : {}),
            ...(validOwnerRole ? { ownerRole: validOwnerRole } : {}),
            ...(typeof ownerId === "string" && ownerId.trim() ? { ownerId: ownerId.trim() } : {}),
            page: parsedPage,
            limit: parsedLimit,
            sortOrder: sortOrder === "asc" ? "asc" : "desc",
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.pagination.total,
            currentPage: result.pagination.page,
            totalPages: result.pagination.totalPages,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch withdrawal requests",
        });
    }
};
export const getWithdrawalByIdAdmin = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const data = await WithdrawalService.getWithdrawalById(withdrawalRequestId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch withdrawal request",
        });
    }
};
export const approveWithdrawal = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated admin not found",
            });
        }
        const data = await WithdrawalService.approveWithdrawal({ withdrawalRequestId: withdrawalRequestId, adminId });
        return res.status(200).json({
            success: true,
            message: "Withdrawal approved successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to approve withdrawal request",
        });
    }
};
export const markWithdrawalProcessing = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated admin not found",
            });
        }
        const data = await WithdrawalService.markProcessing({ withdrawalRequestId: withdrawalRequestId, adminId, adminNotes: req.body.adminNotes });
        return res.status(200).json({
            success: true,
            message: "Withdrawal marked as processing",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to mark withdrawal as processing",
        });
    }
};
export const rejectWithdrawal = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated admin not found",
            });
        }
        const data = await WithdrawalService.rejectWithdrawal({ withdrawalRequestId: withdrawalRequestId, adminId, reason: req.body.reason, adminNotes: req.body.adminNotes });
        return res.status(200).json({
            success: true,
            message: "Withdrawal rejected successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to reject withdrawal request",
        });
    }
};
export const markWithdrawalPaid = async (req, res) => {
    try {
        const { withdrawalRequestId } = req.params;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated admin not found",
            });
        }
        const data = await WithdrawalService.markPaid({
            withdrawalRequestId: withdrawalRequestId,
            adminId,
            paymentMethod: req.body.paymentMethod,
            paymentReference: req.body.paymentReference,
            adminNotes: req.body.adminNotes,
        });
        return res.status(200).json({
            success: true,
            message: "Withdrawal marked as paid successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to mark withdrawal as paid",
        });
    }
};
//# sourceMappingURL=withdrawal.controller.js.map