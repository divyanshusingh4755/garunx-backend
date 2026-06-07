import { ServiceService } from "../services/service.service.js";
import { ServiceDiagnosticsEngine } from "../services/diagnostic-engine.service.js";
import { stat } from "node:fs/promises";
export const createService = async (req, res) => {
    try {
        const service = await ServiceService.createService(req.body);
        res.status(201).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        if (error.name === "ValidationError" || error.isOperational) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Service with this reference already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || "Interal server error",
        });
    }
};
export const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceService.updateService(serviceId, req.body);
        res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleServiceStatus = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { isActive, confirmed } = req.body;
        if (!serviceId || isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: "Service ID and isActive are required.",
            });
        }
        const result = await ServiceService.toggleServiceStatus(serviceId, isActive, confirmed);
        if (result?.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This service is linked with services/packages. Please confirm.",
                data: result,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
            data: result,
        });
    }
    catch (error) {
        res.status(error.message === "Service not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await ServiceService.getServiceById(serviceId);
        res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getServicesByLocation = async (req, res) => {
    try {
        const { cityIds, limit, page, isActive, isComplete, sortBy, sortOrder } = req.body;
        const activeBool = isActive === "true" ? true : isActive === "false" ? false : undefined;
        const completeBool = isComplete === "true" ? true : isComplete === "false" ? false : undefined;
        const { data, total, page: currentPage, totalPages, } = await ServiceService.getServicesByLocation(cityIds, Number(limit) || 20, Number(page) || 1, activeBool, completeBool, sortBy || "name", sortOrder || "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            page: currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllServices = async (req, res) => {
    try {
        const { searchTerm, categoryId, locationId, limit, page, isActive, isComplete, sortBy, sortOrder, } = req.query;
        const activeBool = isActive === "true" ? true : isActive === "false" ? false : undefined;
        const completeBool = isComplete === "true" ? true : isComplete === "false" ? false : undefined;
        const { data, total, page: CurrentPage, totalPages, } = await ServiceService.FindServices(searchTerm, categoryId, locationId, Number(limit) || 20, Number(page) || 1, activeBool, completeBool, sortBy || "name", sortOrder || "asc");
        res.status(200).json({
            success: true,
            data,
            total,
            CurrentPage,
            totalPages,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch services",
        });
    }
};
export const updateServiceLocations = async (req, res) => {
    try {
        const { id } = req.params;
        const { locations } = req.body;
        const result = await ServiceService.updateServiceLocations(id, locations);
        res.status(200).json(result);
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
export const removeServiceLocation = async (req, res) => {
    try {
        const { id, locationId } = req.params;
        const result = await ServiceService.removeServiceLocation(id, locationId);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Service not found") {
            return res.status(400).json({
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
export const updateServiceTiers = async (req, res) => {
    try {
        const { id } = req.params;
        const { tiers } = req.body;
        const result = await ServiceService.updateServiceTiers(id, tiers);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Service not found") {
            return res.status(404).json({
                sucess: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const removeServiceTier = async (req, res) => {
    try {
        const { id, tierId } = req.params;
        const result = await ServiceService.removeServiceTier(id, tierId);
        return res.status(200).json(result);
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
export const getFullService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const data = await ServiceService.getFullService(serviceId);
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
export const getFullServiceByCities = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { cityIds } = req.body;
        if (!Array.isArray(cityIds) || cityIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "cityIds must be a non-empty array",
            });
        }
        const data = await ServiceService.getFullServiceByCities(serviceId, cityIds);
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
export const getServiceDiagnostics = async (req, res) => {
    try {
        const result = await ServiceDiagnosticsEngine.analyze(req.params.serviceId);
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
//# sourceMappingURL=service.controllers.js.map