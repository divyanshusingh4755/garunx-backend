import type { Request, Response } from "express";
import { ProductService } from "../services/product.service.js"

export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await ProductService.createProduct(req.body);

        res.status(201).json({
            success: true,
            data: product
        })
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create product"
        })
    }
}

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        const product = await ProductService.updateProduct(productId as string, req.body);

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update product"
        });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        await ProductService.deleteProduct(productId as string);

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete product"
        });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        const product = await ProductService.getProductById(productId as string);

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(404).json({
            success: false,
            message: error.message || "Product not found"
        });
    }
};

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const {
            searchTerm,
            categoryName,
            location,
            tier,
            limit,
            page,
            isRemovable,
            sortBy,
            sortOrder
        } = req.query;

        const { data, total, page: CurrentPage, totalPages } = await ProductService.FindProducts(
            searchTerm as string,
            categoryName as string,
            location as string,
            tier as string,
            Number(limit) || 20,
            Number(page) || 1,
            isRemovable === 'true' ? true : isRemovable === 'false' ? false : undefined,
            (sortBy as string) || 'name',
            (sortOrder as 'asc' | 'desc') || 'asc'
        );

        res.status(200).json({
            success: true,
            data,
            total,
            CurrentPage,
            totalPages
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch products"
        });
    }
};

export const addVariant = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        const product = await ProductService.addVariant(productId as string, req.body);

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to add variant"
        });
    }
};

export const updateVariant = async (req: Request, res: Response) => {
    try {
        const { productId, variantId } = req.params;

        const product = await ProductService.updateVariant(
            productId as string,
            variantId as any,
            req.body
        );

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update variant"
        });
    }
};

export const deleteVariant = async (req: Request, res: Response) => {
    try {
        const { productId, variantId } = req.params;

        const product = await ProductService.deleteVariant(productId as string, variantId as any);

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete variant"
        });
    }
};

export const getProductForUser = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const { location } = req.query;

        const product = await ProductService.getProductForUser(
            productId as string,
            location as string
        );

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch product"
        });
    }
};

export const getProductsByLocation = async (req: Request, res: Response) => {
    try {
        const { location } = req.query;

        const products = await ProductService.getProductsByLocation(
            location as string
        );

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch products"
        });
    }
};

export const getVariantsByLocationFromId = async (req: Request, res: Response) => {
    try {
        const { variantId } = req.params;

        if (!variantId) {
            return res.status(400).json({
                success: false,
                message: "A valid variantId is required"
            })
        }

        const result = await ProductService.getVariantsByLocationFromId(variantId as string)

        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No product or variant found with that ID."
            })
        }

        return res.status(200).json({
            success: true,
            data: result
        })

    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch variants"
        })
    }
}