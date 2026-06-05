import ComponentItemService from "../services/componentitem.service.js";
export const createComponentItem = async (req, res) => {
    try {
        const componentItem = await ComponentItemService.createComponentItem(req.body);
        res.status(201).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create component item",
        });
    }
};
export const updateComponentItem = async (req, res) => {
    try {
        const { componentItemId } = req.params;
        const componentItem = await ComponentItemService.updateComponentItem(componentItemId, req.body);
        res.status(200).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update component item",
        });
    }
};
export const getComponentItemById = async (req, res) => {
    try {
        const { componentItemId } = req.params;
        const componentItem = await ComponentItemService.getComponentItemById(componentItemId);
        res.status(200).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to get component item by id",
        });
    }
};
export const getAllComponentItems = async (req, res) => {
    try {
        const { searchTerm, limit, page, isActive, sortBy, sortOrder } = req.query;
        const parseBool = (val) => val === "true" ? true : val === "false" ? false : undefined;
        const { data, total, page: CurrentPage, totalPages, } = await ComponentItemService.getAllComponentItems(searchTerm, Number(limit) || 20, Number(page) || 1, parseBool(isActive), sortBy || "name", sortOrder || "asc");
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
            message: error.message || "Failed to get all component item",
        });
    }
};
export const updateComponentItemStatus = async (req, res) => {
    try {
        const { componentItemId } = req.params;
        const { isActive, confirmed } = req.body;
        const result = await ComponentItemService.updateComponentItemStatus(componentItemId, isActive, confirmed);
        if (result?.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This component item is used in service configurations.",
                data: result,
            });
        }
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to update status of component item",
        });
    }
};
//# sourceMappingURL=componentItem.controllers.js.map