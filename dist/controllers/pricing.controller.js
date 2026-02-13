import { PricingSerive } from "../services/pricing.service.js";
export const addOrUpdatePricing = async (req, res) => {
    try {
        const pricing = await PricingSerive.upsertServicePrice(req.body);
        res.status(200).json({
            success: true,
            message: "Price updated successfully",
            data: pricing
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getPricesByLocation = async (req, res) => {
    try {
        const { locationIds } = req.body;
        const prices = await PricingSerive.fetchByLocation(locationIds);
        res.status(200).json({
            success: true,
            count: prices.length,
            data: prices
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getPriceDetails = async (req, res) => {
    try {
        const { serviceId, locationId } = req.query;
        if (!serviceId || !locationId) {
            return res.status(400).json({ success: false, message: "ServiceID and locationID are required" });
        }
        const price = await PricingSerive.fetchPriceDetails(serviceId, locationId);
        if (!price) {
            return res.status(400).json({ success: false, message: "Pricing not found for this selection" });
        }
        res.status(200).json({ success: true, data: price });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getAllSerivces = async (req, res) => {
    try {
        const services = await PricingSerive.getAllSerivces();
        res.status(200).json({ success: true, data: services });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=pricing.controller.js.map