import { ReferralRewardService } from "../services/referralreward.service.js";
export const getReferralInfo = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const data = await ReferralRewardService.getReferralInfo(userId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getReferralStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const data = await ReferralRewardService.getReferralStats(userId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getReferralHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { page, limit } = req.query;
        const { data, total, page: currentPage, totalPages, } = await ReferralRewardService.getReferralHistory(userId, Number(page) || 1, Number(limit) || 20);
        return res.status(200).json({
            success: true,
            data,
            total,
            page: currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getReferralRewards = async (req, res) => {
    try {
        const { page, limit, status, userId } = req.query;
        const { data, total, page: currentPage, totalPages, } = await ReferralRewardService.getReferralRewards(userId, Number(page) || 1, Number(limit) || 20, status);
        return res.status(200).json({
            success: true,
            data,
            total,
            page: currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=referralreward.controllers.js.map