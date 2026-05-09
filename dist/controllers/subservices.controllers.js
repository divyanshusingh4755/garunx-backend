import { SubServiceComponentService } from "../services/subservices.service.js";
export const createSubServiceComponent = async (req, res) => {
    try {
        const { name, description, serviceId, image, isActive } = req.body;
        await SubServiceComponentService.createSubServiceComponent(name, description, serviceId, image, isActive);
        res.status(200).json({
            success: true,
            data: "Sub Service Component created successfully",
        });
    }
    catch (error) {
        res
            .status(error.message === "Sub Service Component not found" ? 404 : 400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
export const updateSubServiceComponent = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await SubServiceComponentService.updateSubServiceComponent(id, req.body);
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res
            .status(error.message === "Sub Service Component not found" ? 404 : 400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllSubServiceComponents = async (req, res) => {
    try {
        const { searchTerm, serviceId, limit, page, isActive, sortBy, sortOrder } = req.query;
        let activeStatus;
        if (isActive === "true")
            activeStatus = true;
        else if (isActive === "false")
            activeStatus = false;
        const result = await SubServiceComponentService.findSubServiceComponents(searchTerm, serviceId, Number(limit) || 40, Number(page) || 1, activeStatus, sortBy || "name", sortOrder || "asc");
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
export const getSubServiceComponentById = async (req, res) => {
    try {
        const { id } = req.params;
        const subServiceComponent = await SubServiceComponentService.getSubServiceComponentById(id);
        res.status(200).json({
            success: true,
            data: subServiceComponent,
        });
    }
    catch (error) {
        res
            .status(error.message === "Sub Service Component not found" ? 404 : 400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleSubServiceComponent = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || status === undefined) {
            return res.status(400).json({
                success: false,
                message: "Sub Service Component ID and status are required.",
            });
        }
        const subServiceComponent = await SubServiceComponentService.toggleSubServiceComponent(id, status);
        res.status(200).json({
            success: true,
            message: `Sub Service Component marked as ${status}`,
            data: subServiceComponent,
        });
    }
    catch (error) {
        res
            .status(error.message === "Sub Service Component not found" ? 404 : 400)
            .json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=subservices.controllers.js.map