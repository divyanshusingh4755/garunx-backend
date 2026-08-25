import { PackageTierPricingService } from "../services/packagetierpricing.service.js";
import { HttpError } from "../utils/httpError.js";
const getStatusCode = (error) => {
    if (error instanceof HttpError) {
        return error.statusCode;
    }
    if (typeof error === "object" && error !== null && "name" in error && error.name === "ValidationError") {
        return 400;
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
        return 409;
    }
    return 500;
};
const getErrorMessage = (error, fallback) => { return error instanceof Error ? error.message : fallback; };
export const bulkUpsertPackageTierPricing = async (req, res) => {
    try {
        const result = await PackageTierPricingService.bulkUpsertTierPricing(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to update package tier pricing"),
        });
    }
};
export const resolvePackagePricing = async (req, res) => {
    try {
        const { packageId, tierId, locationId } = req.query;
        const data = await PackageTierPricingService.resolvePricing(packageId, tierId, locationId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: getErrorMessage(error, "Failed to resolve package pricing"),
        });
    }
};
//# sourceMappingURL=packagetierpricing.controllers.js.map