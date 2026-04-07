import { Router, type Request, type Response, type NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

import {
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getAllProducts,
    addVariant,
    updateVariant,
    deleteVariant,
    getProductForUser,
    getProductsByLocation,
    getVariantsByLocationFromId
} from "../controllers/product.controllers.js";

import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError
        });
    }
    next();
};

const productValidation = [
    body("name")
        .notEmpty().withMessage("Product name is required")
        .isString().trim(),

    body("categoryName")
        .notEmpty().withMessage("Category is required"),

    body("description")
        .notEmpty().withMessage("Description is required"),

    body("unit")
        .optional()
        .isString(),

    body("variants")
        .optional()
        .isArray().withMessage("Variants must be an array"),

    validate
];

const variantValidation = [
    body("location")
        .notEmpty().withMessage("Location is required"),

    body("tier")
        .notEmpty().withMessage("Tier is required"),

    body("price")
        .notEmpty().withMessage("Price is required")
        .isFloat({ min: 0 }).withMessage("Price must be >= 0"),

    validate
];

const productIdValidation = [
    param("productId")
        .isMongoId().withMessage("Invalid product ID"),
    validate
];

const variantIdValidation = [
    param("variantId")
        .isMongoId().withMessage("Invalid variant ID"),
    validate
];

const locationQueryValidation = [
    query("location")
        .notEmpty().withMessage("Location is required"),
    validate
];

// Get all products with filters
router.get("/", getAllProducts);

// Get products by location
router.get("/by-location", locationQueryValidation, getProductsByLocation);

// Get single product (with location filter)
router.get("/:productId", productIdValidation, getProductForUser);

// Get variant by location and variantId
router.get('/variants-by-location/:variantId', getVariantsByLocationFromId)


// Create product
router.post("/", authenticate, productValidation, createProduct );

// Update product
router.put("/:productId",
    authenticate,
    productIdValidation,
    updateProduct
);

// Delete product
router.delete("/:productId", authenticate, productIdValidation, deleteProduct );

// Get product (full view)
router.get("/:productId", authenticate, productIdValidation, getProductById );

// Add variant
router.post("/:productId/variants", authenticate, productIdValidation, variantValidation, addVariant );

// Update variant
router.put("/:productId/variants/:variantId", authenticate, productIdValidation, variantIdValidation, updateVariant );

// Delete variant
router.delete("/:productId/variants/:variantId", authenticate, productIdValidation, variantIdValidation, deleteVariant );

export default router;