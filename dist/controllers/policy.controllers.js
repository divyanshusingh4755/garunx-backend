import { PolicyService } from "../services/policy.service.js";
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const getErrorStatus = (error) => {
    if (!(error instanceof Error)) {
        return 400;
    }
    if (error.message ===
        "Policy not found" ||
        error.message.includes("policy not found") ||
        error.message ===
            "No policies found for export") {
        return 404;
    }
    return 400;
};
export const createPolicy = async (req, res) => {
    try {
        const { type, userType, title, content } = req.body;
        const data = await PolicyService.createPolicy({
            type,
            userType,
            title,
            content,
        });
        return res.status(201).json({
            success: true,
            data,
        });
    }
    catch (error) {
        if (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A policy version was created concurrently. Please retry.",
            });
        }
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to create policy"),
        });
    }
};
export const updatePolicy = async (req, res) => {
    try {
        const payload = {};
        if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
            payload.title = req.body.title;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "content")) {
            payload.content = req.body.content;
        }
        const data = await PolicyService.updatePolicy(req.params.id, payload);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update policy"),
        });
    }
};
export const getAllPolicies = async (req, res) => {
    try {
        const { page, isActive, limit, type, userType } = req.query;
        const parsedPage = typeof page === "number" ? page : Number(page);
        const parsedLimit = typeof limit === "number" ? limit : Number(limit);
        const result = await PolicyService.getAllPolicies(Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1, Number.isInteger(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 20, isActive === "true" ? true : isActive === "false" ? false : undefined, typeof type === "string" ? type : undefined, typeof userType === "string" ? userType : undefined);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch policies"),
        });
    }
};
export const togglePolicyStatus = async (req, res) => {
    try {
        const data = await PolicyService.togglePolicyStatus(req.params.id, req.body.isActive);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update policy status"),
        });
    }
};
export const getPolicyByType = async (req, res) => {
    try {
        const data = await PolicyService.getPolicyByType(req.params.type, req.query.userType);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to fetch policy"),
        });
    }
};
export const exportPoliciesCsv = async (req, res) => {
    try {
        const { policyIds, } = req.body;
        const result = await PolicyService.exportPoliciesToCsv(policyIds);
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="policies-${timestamp}.csv"`);
        return res
            .status(200)
            .send(result.csv);
    }
    catch (error) {
        return res
            .status(getErrorStatus(error))
            .json({
            success: false,
            message: getErrorMessage(error, "Failed to export policies"),
        });
    }
};
//# sourceMappingURL=policy.controllers.js.map