import { ServicePricingService } from "../services/servicepricing.service.js";
export const bulkUpsertTierPricing = async (req, res) => {
    try {
        const result = await ServicePricingService.bulkUpsertTierPricing(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const resolvePricing = async (req, res) => {
    try {
        const { serviceId, tierId, locationId } = req.query;
        const data = await ServicePricingService.resolvePricing(serviceId, tierId, locationId);
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
//# sourceMappingURL=servicepricing.controllers.js.map