import { PackageTierMapService } from "../services/packagetiermap.service.js";
export const bulkUpsertPackageTierMappings = async (req, res) => {
    try {
        const result = await PackageTierMapService.bulkUpsertMappings(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const replacePackageTierMappings = async (req, res) => {
    try {
        const result = await PackageTierMapService.replaceMappings(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getServicesByPackageAndTier = async (req, res) => {
    try {
        const { packageId, tierId } = req.params;
        const data = await PackageTierMapService.getServicesByPackageAndTier(packageId, tierId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        if (error.message === "Package not found") {
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
export const updatePackageTierService = async (req, res) => {
    try {
        const result = await PackageTierMapService.patchService(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=packagetiermap.controllers.js.map