import { ProductService } from "../services/product.service.js";
export const createProduct = async (req, res) => {
    try {
        const product = await ProductService.createProduct(req.body);
        res.status(201).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create product"
        });
    }
};
export const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await ProductService.updateProduct(productId, req.body);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update product"
        });
    }
};
export const updateProductStatus = async (req, res) => {
    try {
        const { productId } = req.params;
        const { isActive } = req.body;
        await ProductService.updateProductStatus(productId, isActive);
        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete product"
        });
    }
};
export const getProductById = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await ProductService.getProductById(productId);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            message: error.message || "Product not found"
        });
    }
};
export const getAllProducts = async (req, res) => {
    try {
        const { searchTerm, categoryName, location, tier, limit, page, isRemovable, isActive, sortBy, sortOrder } = req.query;
        const parseBool = (val) => val === 'true' ? true : val === 'false' ? false : undefined;
        const { data, total, page: CurrentPage, totalPages } = await ProductService.FindProducts(searchTerm, categoryName, location, tier, Number(limit) || 20, Number(page) || 1, parseBool(isRemovable), parseBool(isActive), sortBy || 'name', sortOrder || 'asc');
        res.status(200).json({
            success: true,
            data,
            total,
            CurrentPage,
            totalPages
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch products"
        });
    }
};
export const addVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await ProductService.addVariant(productId, req.body);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to add variant"
        });
    }
};
export const updateVariant = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const product = await ProductService.updateVariant(productId, variantId, req.body);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update variant"
        });
    }
};
export const toggleVariantStatus = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const { isActive } = req.body;
        const product = await ProductService.toggleVariantStatus(productId, variantId, isActive);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete variant"
        });
    }
};
export const getProductForUser = async (req, res) => {
    try {
        const { productId } = req.params;
        const { location } = req.query;
        const product = await ProductService.getProductForUser(productId, location);
        res.status(200).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch product"
        });
    }
};
export const getProductsByLocation = async (req, res) => {
    try {
        const { location } = req.query;
        const products = await ProductService.getProductsByLocation(location);
        res.status(200).json({
            success: true,
            data: products
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch products"
        });
    }
};
export const getVariantsByLocationFromId = async (req, res) => {
    try {
        const { variantId } = req.params;
        if (!variantId) {
            return res.status(400).json({
                success: false,
                message: "A valid variantId is required"
            });
        }
        const result = await ProductService.getVariantsByLocationFromId(variantId);
        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No product or variant found with that ID."
            });
        }
        return res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch variants"
        });
    }
};
//# sourceMappingURL=product.controllers.js.map