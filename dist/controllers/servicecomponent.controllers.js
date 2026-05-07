import { ServiceComponentService } from "../services/servicecomponent.service.js";
export const bulkUpsertServiceComponents = async (req, res) => {
    try {
        const result = await ServiceComponentService.bulkUpsertComponents(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const replaceServiceComponents = async (req, res) => {
    try {
        const result = await ServiceComponentService.replaceComponents(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getComponentsByServiceAndTier = async (req, res) => {
    try {
        const { serviceId, tierId } = req.params;
        const data = await ServiceComponentService.getComponentsByServiceAndTier(serviceId, tierId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        if (error.message === "Service not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateServiceComponent = async (req, res) => {
    try {
        const result = await ServiceComponentService.patchComponent(req.body);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=servicecomponent.controllers.js.map