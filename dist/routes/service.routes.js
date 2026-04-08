import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { addSubService, updateSubService, getServiceDetails, getAllServices, createService, updateService, getServiceById, getFilteredServices, toggleSubServiceStatus, toggleServiceStatus, addVariantsToSubService, updateVariantInSubService } from "../controllers/service.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { toggleVariantStatus } from "../controllers/product.controllers.js";
const router = Router();
const validate = (req, res, next) => {
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
const addVariantsValidation = [
    body("variants")
        .isArray({ min: 1 }).withMessage("Variants must be a non-empty array"),
    body("variants.*.variantId")
        .isMongoId().withMessage("Each variantId must be a valid MongoID"),
    body("variants.*.quantity")
        .optional()
        .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("variants.*.displayOrder")
        .optional()
        .isInt({ min: 0 }).withMessage("Display order must be 0 or greater"),
    body("variants.*.isOptional")
        .optional()
        .isBoolean().withMessage("isOptional must be a boolean"),
    body("variants.*.isEditable")
        .optional()
        .isBoolean().withMessage("isEditable must be a boolean"),
    validate
];
const updateVariantValidation = [
    param("variantId").isMongoId().withMessage("Invalid variant ID"),
    body("quantity")
        .optional()
        .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 }).withMessage("Display order must be 0 or greater"),
    body("isOptional")
        .optional()
        .isBoolean().withMessage("isOptional must be a boolean"),
    body("isEditable")
        .optional()
        .isBoolean().withMessage("isEditable must be a boolean"),
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
router.patch("/:serviceId/status", authenticate, serviceIdValidation, toggleServiceStatus);
router.get("/get-service-by-id/:serviceId", authenticate, serviceIdValidation, getServiceById);
router.post("/:serviceId/subservices", authenticate, serviceIdValidation, subServiceValidation, addSubService);
router.put("/:serviceId/subservices/:subServiceId", authenticate, serviceIdValidation, subServiceIdValidation, updateSubService);
router.patch("/:serviceId/subservices/:subServiceId/status", authenticate, serviceIdValidation, subServiceIdValidation, toggleSubServiceStatus);
router.post("/:serviceId/subservices/:subServiceId/variants", authenticate, serviceIdValidation, subServiceIdValidation, addVariantsValidation, addVariantsToSubService);
router.patch("/:serviceId/subservices/:subServiceId/products/:productId/status", authenticate, serviceIdValidation, subServiceIdValidation, productIdValidation, toggleVariantStatus);
router.patch("/:serviceId/subservices/:subServiceId/variants/:variantId", authenticate, serviceIdValidation, updateVariantValidation, updateVariantInSubService);
export default router;
//# sourceMappingURL=service.routes.js.map