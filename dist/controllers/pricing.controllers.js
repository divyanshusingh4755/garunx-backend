import { PricingService } from "../services/pricing.service.js";
const engine = new PricingService();
export const calculatePrice = async (req, res) => {
    try {
        const { targetId, type, location, tier, selectedOptionalVariantIds, } = req.body;
        if (!targetId || !type || !location || !tier) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: targetId, type, location and tier are required"
            });
        }
        const pricingRequest = {
            targetId,
            type,
            selectedVariantIds: selectedOptionalVariantIds || []
        };
        const result = await engine.calculate(pricingRequest);
        return res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        if (error.message.includes("not found") || error.message.includes("not defined")) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "An internal error occured while calculating price"
        });
    }
};
//# sourceMappingURL=pricing.controllers.js.map