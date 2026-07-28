import { PackageTierPricingService, } from "../services/packagetierpricing.service.js";
export const bulkUpsertPackageTierPricing = async (req, res) => {
    try {
        const result = await PackageTierPricingService
            .bulkUpsertTierPricing(req.body);
        return res
            .status(200)
            .json(result);
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
export const resolvePackagePricing = async (req, res) => {
    try {
        const { packageId, tierId, locationId, } = req.query;
        const data = await PackageTierPricingService
            .resolvePricing(packageId, tierId, locationId);
        return res
            .status(200)
            .json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=packagetierpricing.controllers.js.map