import { StateService } from "../services/state.service.js";
export const createState = async (req, res) => {
    try {
        const { state, country, image, description, location } = req.body;
        await StateService.createState(state, country, image, description, location);
        res.status(200).json({ success: true, data: "State created successfully" });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const updateState = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await StateService.updateState(id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getAllState = async (req, res) => {
    try {
        const { searchTerm, stateFilter, countryFilter, limit, page, isActive } = req.query;
        const { data, total, page: CurrentPage, totalPages } = await StateService.FindState(searchTerm, stateFilter, countryFilter, Number(limit) || 40, Number(page) || 1, isActive === 'true' ? true : isActive === 'false' ? false : undefined);
        res.status(200).json({ success: true, data, total, CurrentPage, totalPages });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const getStateById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await StateService.getStateById(id);
        res.status(200).json({ success: true, data: location });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
export const deleteState = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "User ID and status are required."
            });
        }
        const state = await StateService.softDeleteState(id, status);
        res.status(200).json({
            success: true,
            message: `State marked as ${status}`,
            data: state
        });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message
        });
    }
};
//# sourceMappingURL=state.controllers.js.map