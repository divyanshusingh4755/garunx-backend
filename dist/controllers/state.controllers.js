import { StateService } from "../services/state.service.js";
export const createState = async (req, res) => {
    try {
        const { name, country, gstCode, image, description, location, } = req.body;
        const state = await StateService.createState(name, country, gstCode, image, description, location);
        return res.status(201).json({
            success: true,
            message: "State created successfully",
            data: state,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
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
            message: error.message,
        });
    }
};
export const getAllState = async (req, res) => {
    try {
        const { searchTerm, stateFilter, countryFilter, limit, page, isActive, sortBy, sortOrder, } = req.query;
        let activeStatus;
        if (isActive === "true")
            activeStatus = true;
        else if (isActive === "false")
            activeStatus = false;
        const result = await StateService.FindState(searchTerm, countryFilter, stateFilter, Number(limit) || 40, Number(page) || 1, activeStatus, sortBy || "state", sortOrder || "asc");
        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            currentPage: result.page,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
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
            message: error.message,
        });
    }
};
export const deleteState = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (typeof status !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "status must be a boolean",
            });
        }
        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "State ID and status are required.",
            });
        }
        const state = await StateService.softDeleteState(id, status);
        res.status(200).json({
            success: true,
            message: `State marked as ${status}`,
            data: state,
        });
    }
    catch (error) {
        res.status(error.message === "State not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=state.controllers.js.map