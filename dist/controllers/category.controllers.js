import { CategoryService } from "../services/category.service.js";
const parsePositiveInteger = (value, fallback, maximum) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return maximum ? Math.min(parsed, maximum) : parsed;
};
export const createCategory = async (req, res) => {
    try {
        const { label, value, type, image, description, displayOrder, isActive } = req.body;
        const newCategory = await CategoryService.createCategory({
            label,
            value,
            type,
            image,
            description,
            displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
            isActive: typeof isActive === "boolean" ? isActive : true,
        });
        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: newCategory,
        });
    }
    catch (error) {
        const status = error.message.includes("already exists") ? 409 : 400;
        return res.status(status).json({
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
            displayOrder,
            isActive,
        });
        return res.status(200).json({
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
        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await CategoryService.getCategoryById(id);
        return res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        return res.status(error.message === "Category not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await CategoryService.deleteCategory(id);
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    }
    catch (error) {
        const status = error.message === "Category not found" ? 404 : 400;
        return res.status(status).json({
            success: false,
            message: error.message,
        });
    }
};
export const toggleCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmed = false } = req.body;
        const result = await CategoryService.toggleCategoryStatus(id, confirmed);
        if (result.requiresConfirmation) {
            return res.status(200).json({
                success: true,
                requiresConfirmation: true,
                message: "This category is linked with components, services, or packages.",
                data: result,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Category ${result.isActive ? "activated" : "deactivated"} successfully`,
            data: result,
        });
    }
    catch (error) {
        return res.status(error.message === "Category not found" ? 404 : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllCategories = async (req, res) => {
    try {
        const { searchTerm, type, limit, page, sortBy, sortOrder, } = req.query;
        const parsedLimit = parsePositiveInteger(limit, 40, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const { data, total, page: currentPage, totalPages, } = await CategoryService.findCategories(typeof searchTerm === "string"
            ? searchTerm
            : undefined, type === "service" ||
            type === "product"
            ? type
            : undefined, parsedLimit, parsedPage, 
        /*
         * Public API must only expose
         * active categories.
         */
        true, typeof sortBy === "string"
            ? sortBy
            : "displayOrder", sortOrder === "desc"
            ? "desc"
            : "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to fetch categories",
        });
    }
};
export const getAllCategoriesAdmin = async (req, res) => {
    try {
        const { searchTerm, type, limit, page, isActive, sortBy, sortOrder, } = req.query;
        const parsedLimit = parsePositiveInteger(limit, 40, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const activeStatus = isActive === "true"
            ? true
            : isActive === "false"
                ? false
                : undefined;
        const { data, total, page: currentPage, totalPages, } = await CategoryService.findCategories(typeof searchTerm === "string"
            ? searchTerm
            : undefined, type === "service" ||
            type === "product"
            ? type
            : undefined, parsedLimit, parsedPage, activeStatus, typeof sortBy === "string"
            ? sortBy
            : "displayOrder", sortOrder === "desc"
            ? "desc"
            : "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to fetch categories",
        });
    }
};
export const exportCategoriesCsv = async (req, res) => {
    try {
        const { categoryIds, } = req.body;
        const result = await CategoryService
            .exportCategoriesToCsv(categoryIds);
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="categories-${timestamp}.csv"`);
        return res
            .status(200)
            .send(result.csv);
    }
    catch (error) {
        if (error.message ===
            "No categories found for export") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to export categories",
        });
    }
};
//# sourceMappingURL=category.controllers.js.map