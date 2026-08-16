import { TaxProfileService, } from "../services/taxprofile.service.js";
const getStatusCode = (error) => {
    if (typeof error?.statusCode === "number") {
        return error.statusCode;
    }
    if (error?.name === "ValidationError") {
        return 400;
    }
    if (error?.code === 11000) {
        return 409;
    }
    return 500;
};
function getAuthenticatedUserId(req) {
    const userId = req.user?.userId;
    return userId ? String(userId) : null;
}
export class TaxProfileController {
    static async create(req, res, next) {
        try {
            const adminId = getAuthenticatedUserId(req);
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const payload = {
                name: req.body.name,
                code: req.body.code,
                treatment: req.body.treatment,
                totalRate: req.body.totalRate,
                createdBy: adminId,
            };
            if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
                payload.description = req.body.description;
            }
            const taxProfile = await TaxProfileService.createTaxProfile(payload);
            return res.status(201).json({
                success: true,
                message: "Tax profile created successfully",
                data: taxProfile,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to create tax profile",
            });
        }
    }
    static async list(req, res, next) {
        try {
            const filters = {};
            if (typeof req.query.search === "string") {
                filters.search = req.query.search;
            }
            if (typeof req.query.treatment === "string") {
                filters.treatment = req.query.treatment;
            }
            if (req.query.isActive === "true") {
                filters.isActive = true;
            }
            else if (req.query.isActive === "false") {
                filters.isActive = false;
            }
            const page = typeof req.query.page === "number"
                ? req.query.page
                : Number(req.query.page);
            if (Number.isInteger(page) && page > 0) {
                filters.page = page;
            }
            const limit = typeof req.query.limit === "number"
                ? req.query.limit
                : Number(req.query.limit);
            if (Number.isInteger(limit) && limit > 0) {
                filters.limit = Math.min(limit, 100);
            }
            const result = await TaxProfileService.getTaxProfiles(filters);
            return res.status(200).json({
                success: true,
                message: "Tax profiles fetched successfully",
                ...result,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to list tax profile",
            });
        }
    }
    static async listActive(_req, res, next) {
        try {
            const taxProfiles = await TaxProfileService.getActiveTaxProfiles();
            return res.status(200).json({
                success: true,
                message: "Active tax profiles fetched successfully",
                data: taxProfiles,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to list active tax profile",
            });
        }
    }
    static async getById(req, res, next) {
        try {
            const taxProfile = await TaxProfileService.getTaxProfileById(req.params.taxProfileId);
            return res.status(200).json({
                success: true,
                data: taxProfile,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to get tax profile",
            });
        }
    }
    static async update(req, res, next) {
        try {
            const adminId = getAuthenticatedUserId(req);
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const payload = {
                updatedBy: adminId,
            };
            if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
                payload.name = req.body.name;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, "treatment")) {
                payload.treatment = req.body.treatment;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, "totalRate")) {
                payload.totalRate = req.body.totalRate;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
                payload.description = req.body.description;
            }
            const taxProfile = await TaxProfileService.updateTaxProfile(req.params.taxProfileId, payload);
            return res.status(200).json({
                success: true,
                message: "Tax profile updated successfully",
                data: taxProfile,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to update tax profile",
            });
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const adminId = getAuthenticatedUserId(req);
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const taxProfile = await TaxProfileService.updateTaxProfileStatus(req.params.taxProfileId, req.body.isActive, adminId);
            return res.status(200).json({
                success: true,
                message: req.body.isActive
                    ? "Tax profile activated successfully"
                    : "Tax profile deactivated successfully",
                data: taxProfile,
            });
        }
        catch (error) {
            return res.status(getStatusCode(error)).json({
                success: false,
                message: error.message || "Failed to update status tax profile",
            });
        }
    }
    static async exportCsv(req, res, next) {
        try {
            const { taxProfileIds, } = req.body;
            const result = await TaxProfileService.exportTaxProfilesToCsv(taxProfileIds);
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="tax-profiles-${timestamp}.csv"`);
            return res
                .status(200)
                .send(result.csv);
        }
        catch (error) {
            return next(error);
        }
    }
}
//# sourceMappingURL=taxprofile.controller.js.map