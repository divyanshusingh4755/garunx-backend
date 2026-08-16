import ComponentItemService from "../services/componentitem.service.js";
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
export const createComponentItem = async (req, res) => {
    try {
        const { name, price, isActive } = req.body;
        const componentItem = await ComponentItemService.createComponentItem({
            name,
            ...(price !== undefined && {
                price,
            }),
            ...(isActive !== undefined && {
                isActive,
            }),
        });
        return res.status(201).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to create component item",
        });
    }
};
export const updateComponentItem = async (req, res) => {
    try {
        const componentItem = await ComponentItemService.updateComponentItem(req.params.componentItemId, req.body);
        return res.status(200).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update component item",
        });
    }
};
export const getComponentItemById = async (req, res) => {
    try {
        const componentItem = await ComponentItemService.getComponentItemById(req.params.componentItemId);
        if (!componentItem.isActive) {
            return res.status(404).json({
                success: false,
                message: "Component item not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message ||
                "Failed to get component item",
        });
    }
};
export const getComponentItemByIdAdmin = async (req, res) => {
    try {
        const componentItem = await ComponentItemService.getComponentItemById(req.params.componentItemId);
        return res.status(200).json({
            success: true,
            data: componentItem,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message ||
                "Failed to get component item",
        });
    }
};
export const getAllComponentItems = async (req, res) => {
    try {
        const { searchTerm, limit, page, sortBy, sortOrder, } = req.query;
        const result = await ComponentItemService.getAllComponentItems({
            limit: limit ? Number(limit) : 20,
            page: page ? Number(page) : 1,
            isActive: true,
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
                "Failed to get all component items",
        });
    }
};
export const getAllComponentItemsAdmin = async (req, res) => {
    try {
        const { searchTerm, limit, page, isActive, sortBy, sortOrder, } = req.query;
        const activeStatus = isActive === "true"
            ? true
            : isActive === "false"
                ? false
                : undefined;
        const result = await ComponentItemService.getAllComponentItems({
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
            ...(typeof activeStatus === "boolean" && {
                isActive: activeStatus,
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
                "Failed to get component items",
        });
    }
};
export const updateComponentItemStatus = async (req, res) => {
    try {
        const { isActive, confirmed = false } = req.body;
        const result = await ComponentItemService.updateComponentItemStatus(req.params.componentItemId, isActive, confirmed);
        if (result.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This component item is used in service configurations.",
                data: result,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Component item ${isActive ? "activated" : "deactivated"} successfully`,
            data: result,
        });
    }
    catch (error) {
        return res.status(getStatusCode(error)).json({
            success: false,
            message: error.message || "Failed to update status of component item",
        });
    }
};
export const exportComponentItemsCsv = async (req, res) => {
    try {
        const { componentItemIds, } = req.body;
        const result = await ComponentItemService
            .exportComponentItemsToCsv(componentItemIds);
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="component-items-${timestamp}.csv"`);
        return res
            .status(200)
            .send(result.csv);
    }
    catch (error) {
        return res
            .status(getStatusCode(error))
            .json({
            success: false,
            message: error.message ||
                "Failed to export component items",
        });
    }
};
//# sourceMappingURL=componentItem.controllers.js.map