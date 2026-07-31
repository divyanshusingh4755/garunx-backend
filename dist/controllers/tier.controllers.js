import { TierService } from "../services/tier.service.js";
const getErrorStatus = (message) => {
    if (message === "Tier not found") {
        return 404;
    }
    if (message.includes("already exists") ||
        message.includes("duplicate")) {
        return 409;
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
export const createTier = async (req, res) => {
    try {
        const data = await TierService.createTier(req.body);
        return res.status(201).json({
            success: true,
            message: "Tier created successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Error while creating tier",
        });
    }
};
export const updateTier = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await TierService.updateTier(id, req.body);
        return res.status(200).json({
            success: true,
            message: "Tier updated successfully",
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Error while updating tier",
        });
    }
};
export const getTierById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await TierService.getTierById(id);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Error while getting tier by id",
        });
    }
};
export const toggleTierStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, confirmed = false } = req.body;
        const data = await TierService.toggleTierStatus(id, isActive, confirmed);
        return res.status(200).json({
            success: true,
            requiresConfirmation: data.requiresConfirmation === true,
            message: data.message,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error.message)).json({
            success: false,
            message: error.message || "Error while toggling tier status",
        });
    }
};
export const getAllTier = async (req, res) => {
    try {
        const { searchTerm, limit, page, isActive, sortBy, sortOrder, } = req.query;
        const parsedLimit = parsePositiveInteger(limit, 40, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const { data, total, page: currentPage, totalPages, } = await TierService.findTiers(parsedLimit, parsedPage, sortBy || "createdAt", sortOrder || "asc", searchTerm, isActive === "true"
            ? true
            : isActive === "false"
                ? false
                : undefined);
        return res.status(200).json({
            success: true,
            data,
            total,
            currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch tiers",
        });
    }
};
//# sourceMappingURL=tier.controllers.js.map