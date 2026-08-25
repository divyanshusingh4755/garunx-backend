import { ReferralRewardService } from "../services/referralreward.service.js";
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const getErrorStatus = (error) => {
    if (error instanceof Error && error.message === "User not found") {
        return 404;
    }
    return 400;
};
const getAuthenticatedUserId = (req) => {
    const userId = req.user?.userId;
    return userId ? String(userId) : null;
};
export const getReferralInfo = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const data = await ReferralRewardService.getReferralInfo(userId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch referral information"),
        });
    }
};
export const getReferralStats = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const data = await ReferralRewardService.getReferralStats(userId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch referral statistics"),
        });
    }
};
export const getReferralHistory = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const page = typeof req.query.page === "number" ? req.query.page : Number(req.query.page);
        const limit = typeof req.query.limit === "number" ? req.query.limit : Number(req.query.limit);
        const result = await ReferralRewardService.getReferralHistory(userId, Number.isInteger(page) && page > 0 ? page : 1, Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch referral history"),
        });
    }
};
export const getReferralRewards = async (req, res) => {
    try {
        const page = typeof req.query.page === "number" ? req.query.page : Number(req.query.page);
        const limit = typeof req.query.limit === "number" ? req.query.limit : Number(req.query.limit);
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
        const result = await ReferralRewardService.getReferralRewards(userId, Number.isInteger(page) && page > 0 ? page : 1, Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20, status);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch referral rewards"),
        });
    }
};
export const exportReferralRewardsCsv = async (req, res) => {
    try {
        const { rewardIds } = req.body;
        const result = await ReferralRewardService.exportReferralRewardsToCsv(rewardIds);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="referral-rewards-${timestamp}.csv"`);
        return res.status(200).send(result.csv);
    }
    catch (error) {
        const message = getErrorMessage(error, "Failed to export referral rewards");
        if (message === "No referral rewards found for export") {
            return res.status(404).json({
                success: false,
                message,
            });
        }
        return res.status(400).json({
            success: false,
            message,
        });
    }
};
//# sourceMappingURL=referralreward.controllers.js.map