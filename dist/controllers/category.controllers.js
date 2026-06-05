import { CategoryService } from "../services/category.service.js";
export const createCategory = async (req, res) => {
    try {
        const { label, value, type, image, description, displayOrder, isActive } = req.body;
        const newCategory = await CategoryService.createCategory({
            label,
            value,
            type,
            image,
            description,
            displayOrder: Number(displayOrder) || 0,
            isActive: isActive !== undefined ? isActive : true,
        });
        res.status(201).send({
            success: true,
            message: "Category created successfully",
            data: newCategory,
        });
    }
    catch (error) {
        const status = error.message.includes("already exists") ? 409 : 400;
        res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, value, type, image, description, displayOrder, isActive } = req.body;
        const updatedCategory = await CategoryService.updateCategory(id, {
            label,
            value,
            type,
            image,
            description,
            displayOrder: Number(displayOrder),
            isActive,
        });
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    }
    catch (error) {
        const status = error.message === "Category not found"
            ? 404
            : error.message.includes("already exists")
                ? 409
                : 400;
        res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await CategoryService.getCategoryById(id);
        res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        res.status(error.message === "Category not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await CategoryService.deleteCategory(id);
        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    }
    catch (error) {
        const status = error.message === "Category not found" ? 404 : 400;
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmed = false } = req.body;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required",
            });
        }
        const result = await CategoryService.toggleCategoryStatus(id, confirmed);
        if (result?.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This category is linked with components, services, and packages.",
                data: result,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Category ${result?.isActive ? "activated" : "deactivated"} successfully`,
            data: result,
        });
    }
    catch (error) {
        res.status(error.message === "Category not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllCategories = async (req, res) => {
    try {
        const { searchTerm, type, // 'service' | 'product'
        limit, page, isActive, sortBy, sortOrder, } = req.query;
        const { data, total, page: CurrentPage, totalPages, } = await CategoryService.FindCategories(searchTerm, type, Number(limit) || 40, Number(page) || 1, isActive === "true" ? true : isActive === "false" ? false : undefined, sortBy || "displayOrder", sortOrder || "asc");
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
            message: error.message || "Failed to fetch categories",
        });
    }
};
//# sourceMappingURL=category.controllers.js.map