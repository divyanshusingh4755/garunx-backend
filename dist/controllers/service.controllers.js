import { ServiceService } from "../services/service.service.js";
import { ServiceDiagnosticsEngine } from "../services/diagnostic-engine.service.js";
const getStatusCode = (error) => {
    if (typeof error?.statusCode === "number") {
        return error.statusCode;
    }
    if (error?.name === "ValidationError") {
        return 400;
    }
    if (error?.code === 11000) {
        return 409;
    }
    return 500;
};
export const createService = async (req, res) => {
    try {
        const { name, shortDescription, fullDescription, categoryId, thumbnailImage, bannerImage, } = req.body;
        const service = await ServiceService.createService({
            name,
            shortDescription,
            fullDescription,
            categoryId,
            thumbnailImage,
            ...(bannerImage !== undefined && {
                bannerImage,
            }),
        });
        return res.status(201).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
export const updateService = async (req, res) => {
    try {
        const service = await ServiceService.updateService(req.params.serviceId, req.body);
        return res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update service",
        });
    }
};
export const toggleServiceStatus = async (req, res) => {
    try {
        const { isActive, confirmed = false } = req.body;
        const result = await ServiceService.toggleServiceStatus(req.params.serviceId, isActive, confirmed);
        if (result.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This service is linked with packages or pricing. Please confirm.",
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
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update service status",
        });
    }
};
export const getServiceById = async (req, res) => {
    try {
        const service = await ServiceService.getServiceById(req.params.serviceId);
        return res.status(200).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get service",
        });
    }
};
export const getServicesByLocation = async (req, res) => {
    try {
        const { cityIds, categoryIds, limit, page, sortBy, sortOrder, } = req.query;
        const cityIdArray = typeof cityIds === "string"
            ? cityIds
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
            : undefined;
        const categoryIdArray = typeof categoryIds === "string"
            ? categoryIds
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
            : undefined;
        const result = await ServiceService.getServicesByLocation({
            limit: limit
                ? Number(limit)
                : 20,
            page: page
                ? Number(page)
                : 1,
            /*
             * This is a USER-facing endpoint.
             * Never allow the client to request
             * inactive/incomplete services.
             */
            isActive: true,
            isComplete: true,
            sortBy: typeof sortBy === "string"
                ? sortBy
                : "name",
            sortOrder: sortOrder === "asc" ||
                sortOrder === "desc"
                ? sortOrder
                : "asc",
            ...(cityIdArray !== undefined && {
                cityIds: cityIdArray,
            }),
            ...(categoryIdArray !== undefined && {
                categoryIds: categoryIdArray,
            }),
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res
            .status(getStatusCode(error))
            .json({
            success: false,
            message: error.message ||
                "Failed to fetch services by location",
        });
    }
};
export const getAllServices = async (req, res) => {
    try {
        const { searchTerm, categoryId, locationId, limit, page, sortBy, sortOrder, } = req.query;
        const result = await ServiceService.findServices({
            limit: limit ? Number(limit) : 20,
            page: page ? Number(page) : 1,
            isActive: true,
            isComplete: true,
            sortBy: typeof sortBy === "string"
                ? sortBy
                : "name",
            sortOrder: sortOrder === "asc" ||
                sortOrder === "desc"
                ? sortOrder
                : "asc",
            ...(typeof searchTerm === "string" && {
                searchTerm,
            }),
            ...(typeof categoryId === "string" && {
                categoryId,
            }),
            ...(typeof locationId === "string" && {
                locationId,
            }),
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to fetch services",
        });
    }
};
export const getAllServicesAdmin = async (req, res) => {
    try {
        const { searchTerm, categoryId, locationId, limit, page, isActive, isComplete, sortBy, sortOrder, } = req.query;
        const activeStatus = isActive === "true"
            ? true
            : isActive === "false"
                ? false
                : undefined;
        const completeStatus = isComplete === "true"
            ? true
            : isComplete === "false"
                ? false
                : undefined;
        const result = await ServiceService.findServices({
            limit: limit ? Number(limit) : 20,
            page: page ? Number(page) : 1,
            sortBy: typeof sortBy === "string"
                ? sortBy
                : "name",
            sortOrder: sortOrder === "asc" ||
                sortOrder === "desc"
                ? sortOrder
                : "asc",
            ...(typeof searchTerm === "string" && {
                searchTerm,
            }),
            ...(typeof categoryId === "string" && {
                categoryId,
            }),
            ...(typeof locationId === "string" && {
                locationId,
            }),
            ...(activeStatus !== undefined && {
                isActive: activeStatus,
            }),
            ...(completeStatus !== undefined && {
                isComplete: completeStatus,
            }),
        });
        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message ||
                "Failed to fetch services",
        });
    }
};
export const updateServiceLocations = async (req, res) => {
    try {
        const result = await ServiceService.updateServiceLocations(req.params.id, req.body.locations);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update service locations",
        });
    }
};
export const removeServiceLocation = async (req, res) => {
    try {
        const result = await ServiceService.removeServiceLocation(req.params.id, req.params.locationId);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to remove service location",
        });
    }
};
export const updateServiceTiers = async (req, res) => {
    try {
        const result = await ServiceService.updateServiceTiers(req.params.id, req.body.tiers);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update service tiers",
        });
    }
};
export const removeServiceTier = async (req, res) => {
    try {
        const result = await ServiceService.removeServiceTier(req.params.id, req.params.tierId);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to remove service tier",
        });
    }
};
export const getFullServiceAdmin = async (req, res) => {
    try {
        const data = await ServiceService
            .getFullServiceAdmin(req.params
            .serviceId);
        return res
            .status(200)
            .json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res
            .status(typeof error
            ?.statusCode ===
            "number"
            ? error.statusCode
            : 500)
            .json({
            success: false,
            message: error.message ||
                "Failed to fetch service",
        });
    }
};
export const getFullService = async (req, res) => {
    try {
        const data = await ServiceService.getFullService(req.params.serviceId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get full service",
        });
    }
};
export const getFullServiceByCities = async (req, res) => {
    try {
        const data = await ServiceService.getFullServiceByCities(req.params.serviceId, req.body.cityIds);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get service by cities",
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
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get service diagnostics",
        });
    }
};
export const exportServicesCsv = async (req, res) => {
    try {
        const { serviceIds, } = req.body;
        const result = await ServiceService
            .exportServicesToCsv(serviceIds);
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="services-${timestamp}.csv"`);
        res.setHeader("Cache-Control", "no-store");
        return res
            .status(200)
            .send(`\uFEFF${result.csv}`);
    }
    catch (error) {
        if (error.message ===
            "No services found for export") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message ||
                "Failed to export services",
        });
    }
};
//# sourceMappingURL=service.controllers.js.map