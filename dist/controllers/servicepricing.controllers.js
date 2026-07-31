import { ServicePricingService, } from "../services/servicepricing.service.js";
const getStatusCode = (error) => {
    if (typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number") {
        return error.statusCode;
    }
    if (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name ===
            "ValidationError") {
        return 400;
    }
    if (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code ===
            11000) {
        return 409;
    }
    return 500;
};
const getErrorMessage = (error) => error instanceof Error
    ? error.message
    : "An unexpected error occurred";
export const bulkUpsertTierPricing = async (req, res) => {
    try {
        const result = await ServicePricingService
            .bulkUpsertTierPricing(req.body);
        return res
            .status(200)
            .json(result);
    }
    catch (error) {
        return res
            .status(getStatusCode(error))
            .json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
export const resolvePricing = async (req, res) => {
    try {
        const { serviceId, tierId, locationId, } = req.query;
        const data = await ServicePricingService
            .resolvePricing(serviceId, tierId, locationId);
        return res
            .status(200)
            .json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res
            .status(getStatusCode(error))
            .json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
//# sourceMappingURL=servicepricing.controllers.js.map