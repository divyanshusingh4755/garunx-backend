import { ServicePricingService, } from "../services/servicepricing.service.js";
function getErrorMessage(error) {
    return error instanceof Error
        ? error.message
        : "An unexpected error occurred";
}
export const bulkUpsertTierPricing = async (req, res) => {
    try {
        const result = await ServicePricingService
            .bulkUpsertTierPricing(req.body);
        return res
            .status(200)
            .json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
export const resolvePricing = async (req, res) => {
    try {
        const { serviceId, tierId, locationId, } = req.query;
        const data = await ServicePricingService
            .resolvePricing(String(serviceId), String(tierId), String(locationId));
        return res
            .status(200)
            .json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
//# sourceMappingURL=servicepricing.controllers.js.map