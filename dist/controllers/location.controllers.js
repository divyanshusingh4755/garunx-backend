import { LocationService } from "../services/location.service.js";
export const createLocation = async (req, res) => {
    try {
        const { country, state, city, fullAddress, pincode, image, description, location } = req.body;
        await LocationService.createLocation(country, state, city, fullAddress, pincode, image, description, location);
        res.status(200).json({ success: true, data: "Location created successfully" });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await LocationService.updateLocation(id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getAllLocation = async (req, res) => {
    try {
        const { searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, limit, page } = req.query;
        const { data, total, page: CurrentPage, totalPages } = await LocationService.FindLocation(searchTerm, countryFilter, stateFilter, cityFilter, pincodeFilter, Number(limit) || 40, Number(page) || 1);
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
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
            message: error.message
        });
    }
};
export const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await LocationService.softDeleteLocation(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "Location not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
//# sourceMappingURL=location.controllers.js.map