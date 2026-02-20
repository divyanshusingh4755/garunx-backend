import { CityService } from "../services/city.service.js";
export const createCity = async (req, res) => {
    try {
        const { state, city, image, description, location } = req.body;
        await CityService.createCity(state, city, image, description, location);
        res.status(200).json({ success: true, data: "City created successfully" });
    }
    catch (error) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await CityService.updateCity(id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getAllCity = async (req, res) => {
    try {
        const { searchTerm, stateFilter, cityFilter, limit, page } = req.query;
        const { data, total, page: CurrentPage, totalPages } = await CityService.FindCity(searchTerm, stateFilter, cityFilter, Number(limit) || 40, Number(page) || 1);
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages });
    }
    catch (error) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getCityById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await CityService.getCityById(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required."
            });
        }
        const city = await CityService.softDeleteCity(id, status);
        res.status(200).json({
            success: true,
            message: `City marked as ${status}`,
            data: city
        });
    }
    catch (error) {
        res.status(error.message === "City not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
//# sourceMappingURL=city.controllers.js.map