import { PolicyService } from "../services/policy.service.js";
export const createPolicy = async (req, res) => {
    try {
        const data = await PolicyService.createPolicy(req.body);
        return res.status(201).json({
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
export const updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await PolicyService.updatePolicy(id, req.body);
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
export const getAllPolicies = async (req, res) => {
    try {
        const { page, isActive, limit, type, userType } = req.query;
        const { data, total, page: currentPage, totalPages, } = await PolicyService.getAllPolicies(Number(page) || 1, Number(limit) || 20, isActive === "true" ? true : isActive === "false" ? false : undefined, type, userType);
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
export const togglePolicyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const data = await PolicyService.togglePolicyStatus(id, isActive);
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
export const getPolicyByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { userType } = req.query;
        const data = await PolicyService.getPolicyByType(type, userType);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=policy.controllers.js.map