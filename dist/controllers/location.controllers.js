import { LocationService } from "../services/location.service.js";
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
export const createLocation = async (req, res) => {
    try {
        const { name, country, stateId, cityId, fullAddress, pincode, image, description, location } = req.body;
        const result = await LocationService.createLocation({ name, country, stateId, cityId, fullAddress, pincode, image, description, location });
        return res.status(201).json({
            success: true,
            message: "Location created successfully",
            data: result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to create location",
        });
    }
};
export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await LocationService.updateLocation(id, req.body);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update location",
        });
    }
};
export const getAllLocation = async (req, res) => {
    try {
        const { searchTerm, countryFilter, stateIdFilter, cityIdFilter, pincodeFilter, limit, page, sortBy, sortOrder } = req.query;
        const result = await LocationService.findLocation({
            limit: limit ? Number(limit) : 40,
            page: page ? Number(page) : 1,
            isActive: true,
            sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
            sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",
            ...(typeof searchTerm === "string" && { searchTerm }),
            ...(typeof countryFilter === "string" && { countryFilter }),
            ...(typeof stateIdFilter === "string" && { stateIdFilter }),
            ...(typeof cityIdFilter === "string" && { cityIdFilter }),
            ...(typeof pincodeFilter === "string" && { pincodeFilter }),
        });
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to fetch locations",
        });
    }
};
export const getLocationById = async (req, res) => {
    try {
        const location = await LocationService.getLocationById(req.params.id);
        return res.status(200).json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get location",
        });
    }
};
export const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, confirmed = false } = req.body;
        const result = await LocationService.softDeleteLocation(id, status, confirmed);
        if (result.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This location is linked with services/packages. Please confirm.",
                data: result,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Location ${status ? "activated" : "deactivated"} successfully`,
            data: result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to change location status",
        });
    }
};
export const getLocationIds = async (req, res) => {
    try {
        const { locationIds } = req.body;
        const locations = await LocationService.getLocationByIds(locationIds);
        return res.status(200).json({
            success: true,
            data: locations,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to get locations",
        });
    }
};
export const getAllLocationsAdmin = async (req, res) => {
    try {
        const { searchTerm, countryFilter, stateIdFilter, cityIdFilter, pincodeFilter, limit, page, isActive, sortBy, sortOrder } = req.query;
        const activeStatus = isActive === "true" ? true : isActive === "false" ? false : undefined;
        const result = await LocationService.findLocation({
            limit: limit ? Number(limit) : 40,
            page: page ? Number(page) : 1,
            sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
            sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",
            ...(typeof searchTerm === "string" && { searchTerm }),
            ...(typeof countryFilter === "string" && { countryFilter }),
            ...(typeof stateIdFilter === "string" && { stateIdFilter }),
            ...(typeof cityIdFilter === "string" && { cityIdFilter }),
            ...(typeof pincodeFilter === "string" && { pincodeFilter }),
            ...(typeof activeStatus === "boolean" && { isActive: activeStatus }),
        });
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to fetch locations",
        });
    }
};
export const exportLocationsCsv = async (req, res) => {
    try {
        const { locationIds } = req.body;
        const result = await LocationService.exportLocationsToCsv(locationIds);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="locations-${timestamp}.csv"`);
        return res.status(200).send(result.csv);
    }
    catch (error) {
        if (error.message === "No locations found for export") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to export locations"
        });
    }
};
//# sourceMappingURL=location.controllers.js.map