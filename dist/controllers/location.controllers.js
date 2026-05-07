import { LocationService } from "../services/location.service.js";
export const createLocation = async (req, res) => {
    try {
        const { name, country, stateId, cityId, fullAddress, pincode, image, description, location, } = req.body;
        await LocationService.createLocation({
            name,
            country,
            stateId,
            cityId,
            fullAddress,
            pincode,
            image,
            description,
            location,
        });
        res
            .status(200)
            .json({ success: true, data: "Location created successfully" });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, country, stateId, cityId, fullAddress, pincode, image, description, location, isActive, } = req.body;
        const result = await LocationService.updateLocation(id, {
            name,
            country,
            stateId,
            cityId,
            fullAddress,
            pincode,
            image,
            description,
            location,
            isActive,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllLocation = async (req, res) => {
    try {
        const { searchTerm, countryFilter, stateIdFilter, cityIdFilter, pincodeFilter, limit, page, isActive, sortBy, sortOrder, } = req.query;
        const activeStatus = isActive === "true" ? true : isActive === "false" ? false : undefined;
        const result = await LocationService.FindLocation({
            searchTerm: searchTerm,
            countryFilter: countryFilter,
            stateIdFilter: stateIdFilter,
            cityIdFilter: cityIdFilter,
            pincodeFilter: pincodeFilter,
            limit: Number(limit) || 40,
            page: Number(page) || 1,
            ...(typeof activeStatus === "boolean" && { isActive: activeStatus }),
            sortBy: sortBy || "createdAt",
            sortOrder: sortOrder || "desc",
        });
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await LocationService.getLocationById(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required.",
            });
        }
        const location = await LocationService.softDeleteLocation(id, status);
        res.status(200).json({
            success: true,
            message: `Location marked as ${status}`,
            data: location,
        });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getLocationIds = async (req, res) => {
    try {
        const { locationIds } = (req.body || {});
        if (!locationIds || locationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No location IDs provided",
                data: [],
            });
        }
        const locations = await LocationService.getLocationByIds(locationIds);
        return res.status(200).json({
            success: true,
            data: locations,
        });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
//# sourceMappingURL=location.controllers.js.map