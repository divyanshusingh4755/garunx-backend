import { ComponentService } from "../services/component.service.js";
export const createComponent = async (req, res) => {
    try {
        const component = await ComponentService.createComponent(req.body);
        res.status(201).json({
            success: true,
            data: component,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create component",
        });
    }
};
export const updateComponent = async (req, res) => {
    try {
        const { componentId } = req.params;
        const component = await ComponentService.updateComponent(componentId, req.body);
        res.status(200).json({
            success: true,
            data: component,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update component",
        });
    }
};
export const toggleComponentStatus = async (req, res) => {
    try {
        const { componentId } = req.params;
        const { isActive, confirmed } = req.body;
        const result = await ComponentService.toggleComponentStatus(componentId, isActive, confirmed);
        if (result?.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This component is used in services and pricing records.",
                data: result,
            });
        }
        return res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update component status",
        });
    }
};
export const getComponentById = async (req, res) => {
    try {
        const { componentId } = req.params;
        const component = await ComponentService.getComponentById(componentId);
        res.status(200).json({
            success: true,
            data: component,
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            message: error.message || "Component not found",
        });
    }
};
export const getAllComponents = async (req, res) => {
    try {
        const { searchTerm, categoryId, tier, limit, page, isRemovable, isActive, isBundled, sortBy, sortOrder, } = req.query;
        const parseBool = (val) => val === "true" ? true : val === "false" ? false : undefined;
        const { data, total, page: CurrentPage, totalPages, } = await ComponentService.FindComponents(searchTerm, categoryId, Number(limit) || 20, Number(page) || 1, parseBool(isRemovable), parseBool(isActive), parseBool(isBundled), sortBy || "name", sortOrder || "asc");
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
            message: error.message || "Failed to fetch products",
        });
    }
};
//# sourceMappingURL=component.controllers.js.map