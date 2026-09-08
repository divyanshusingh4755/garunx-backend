import { Role } from "../types/rbac.js";
import { Wallet } from "../models/wallet.model.js";
import { WalletService } from "../services/wallet.service.js";
const getErrorStatus = (message) => {
    if (message.includes("not found")) {
        return 404;
    }
    if (message.includes("inactive") || message.includes("only available")) {
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
export const getMyWallet = async (req, res) => {
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
                message: "Wallet is only available for USER or COORDINATOR"
            });
        }
        const data = await WalletService.getMyWallet(userId, role);
        return res.status(200).json({ success: true, data });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch wallet"
        });
    }
};
export const getMyWalletTransactions = async (req, res) => {
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
                message: "Wallet is only available for USER or COORDINATOR"
            });
        }
        const { page, limit, type, direction, sortOrder } = req.query;
        const parsedPage = parsePositiveInteger(page, 1);
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const result = await WalletService.getMyTransactions(userId, role, {
            page: parsedPage,
            limit: parsedLimit,
            ...(typeof type === "string" && type.trim() ? { type: type.trim() } : {}),
            ...(typeof direction === "string" && direction.trim() ? { direction: direction.trim() } : {}),
            sortOrder: sortOrder || "desc"
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Failed to fetch wallet transactions"
        });
    }
};
//# sourceMappingURL=wallet.controller.js.map