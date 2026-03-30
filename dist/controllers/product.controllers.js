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
export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        await ProductService.deleteProduct(productId);
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
        const { page = 1, limit = 20, categoryName, location, tier } = req.query;
        const data = await ProductService.getAllProducts(Number(page), Number(limit), {
            categoryName: categoryName,
            location: location,
            tier: tier
        });
        res.status(200).json({
            success: true,
            ...data
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
export const deleteVariant = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const product = await ProductService.deleteVariant(productId, variantId);
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
//# sourceMappingURL=product.controllers.js.map