import { Router, type Request, type Response, type NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

import {
    addSubService,
    updateSubService,
    deleteSubService,
    addProductsToSubService,
    removeProductFromSubService,
    getServiceDetails,
    getAllServices,
    createService,
    updateService,
    deleteService,
    getServiceById,
    getFilteredServices
} from "../controllers/service.controllers.js";

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

const serviceIdValidation = [
    param("serviceId")
        .isMongoId().withMessage("Invalid service ID"),
    validate
];

const subServiceIdValidation = [
    param("subServiceId")
        .isMongoId().withMessage("Invalid subService ID"),
    validate
];

const productIdValidation = [
    param("productId")
        .isMongoId().withMessage("Invalid product ID"),
    validate
];

const subServiceValidation = [
    body("name")
        .notEmpty().withMessage("SubService name is required"),

    body("slug")
        .notEmpty().withMessage("Slug is required")
        .isString().trim(),

    body("description")
        .optional()
        .isString(),

    body("displayOrder")
        .optional()
        .isInt({ min: 0 }).withMessage("Display order must be >= 0"),

    validate
];

const addProductsValidation = [
    body("variantIds")
        .isArray({ min: 1 })
        .withMessage("variantIds must be a non-empty array"),

    body("variantIds.*")
        .isMongoId()
        .withMessage("Each productId must be valid"),

    validate
];

const locationQueryValidation = [
    query("location")
        .notEmpty().withMessage("Location is required"),
    validate
];

const serviceValidation = [
    body("name").notEmpty().withMessage("Name is required"),
    body("locations").isArray({ min: 1 }).withMessage("Locations required"),
    body("category").notEmpty().withMessage("Category required"),
    body("shortDescription").notEmpty(),
    body("fullDescription").notEmpty(),
    validate
];

router.get("/", getAllServices);
router.get("/filter", getFilteredServices);
router.get("/:serviceId", serviceIdValidation, locationQueryValidation, getServiceDetails);
router.post("/", authenticate, serviceValidation, createService);
router.put("/:serviceId", authenticate, serviceIdValidation, updateService);
router.delete("/:serviceId", authenticate, serviceIdValidation, deleteService);
router.get("/get-service-by-id/:serviceId", authenticate, serviceIdValidation, getServiceById);
router.post("/:serviceId/subservices", authenticate, serviceIdValidation, subServiceValidation, addSubService);
router.put("/:serviceId/subservices/:subServiceId", authenticate, serviceIdValidation, subServiceIdValidation, updateSubService);
router.delete("/:serviceId/subservices/:subServiceId", authenticate, serviceIdValidation, subServiceIdValidation, deleteSubService);
router.post("/:serviceId/subservices/:subServiceId/products", authenticate, serviceIdValidation, subServiceIdValidation, addProductsValidation, addProductsToSubService);
router.delete("/:serviceId/subservices/:subServiceId/products/:productId", authenticate, serviceIdValidation, subServiceIdValidation, productIdValidation, removeProductFromSubService);

export default router;