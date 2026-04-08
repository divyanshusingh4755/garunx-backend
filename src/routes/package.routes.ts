import { Router, type Request, type Response, type NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

import {
    createPackage,
    updatePackage,
    getPackageDetails,
    updatePackageStatus,
    getPackageById,
    getPackages
} from "../controllers/package.controllers.js";

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

const packageIdValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid package ID"),
    validate
];

const packageValidation = [
    body("name")
        .notEmpty().withMessage("Package name is required"),

    body("slug")
        .notEmpty().withMessage("Slug is required")
        .isString().trim(),

    body("services")
        .isArray({ min: 1 })
        .withMessage("At least one service is required"),

    body("services.*.serviceId")
        .isMongoId()
        .withMessage("Invalid service ID"),

    body("services.*.displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("displayOrder must be >= 0"),

    body("locations")
        .optional()
        .isArray()
        .withMessage("Locations must be an array"),

    body("pricing.type")
        .isIn(["DERIVED", "FIXED"])
        .withMessage("Invalid pricing type"),

    body("pricing.fixedPrice")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Fixed price must be >= 0"),

    validate
];

const statusValidation = [
    body("isActive")
        .isBoolean()
        .withMessage("isActive must be boolean"),
    validate
];

const packageQueryValidation = [
    query("serviceId")
        .optional()
        .isMongoId()
        .withMessage("Invalid serviceId"),

    query("location")
        .optional()
        .isString(),

    query("page")
        .optional()
        .isInt({ min: 1 }),

    query("limit")
        .optional()
        .isInt({ min: 1 }),

    validate
];

const adminQueryValidation = [
    query("search").optional().isString(),

    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),

    query("page")
        .optional()
        .isInt({ min: 1 }),

    query("limit")
        .optional()
        .isInt({ min: 1 }),

    validate
];

router.get("/", packageQueryValidation, getPackages);
router.get("/:id/details", packageIdValidation, getPackageDetails);
router.post("/", authenticate, packageValidation, createPackage);
router.patch("/:id", authenticate, packageIdValidation, packageValidation, updatePackage);
router.patch("/:id/status", authenticate, packageIdValidation, statusValidation, updatePackageStatus);
router.get("/:id", authenticate, packageIdValidation, getPackageById);

export default router;