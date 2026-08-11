import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllBanners, getBannerById, createBanner, updateBanner, toggleBannerStatus, deleteBanner, } from "../controllers/banner.controllers.js";
const PLACEMENTS = [
    "HOME_TOP",
    "HOME_MIDDLE",
    "HOME_BOTTOM",
    "CATEGORY",
    "PRODUCT",
];
const FORMATS = ["WEB", "MOBILE", "BOTH"];
const REDIRECT_TYPES = [
    "NONE",
    "SERVICE",
    "PACKAGE",
    "CATEGORY",
    "PRODUCT",
    "URL",
];
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError,
        });
    }
    next();
};
const bannerIdValidation = [
    param("id").isMongoId().withMessage("Invalid banner ID"),
    validateRequest,
];
const redirectValidation = [
    body("redirect")
        .optional()
        .isObject()
        .withMessage("redirect must be an object"),
    body("redirect.type")
        .optional()
        .isIn(REDIRECT_TYPES)
        .withMessage("Invalid redirect type"),
    body("redirect.refId")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isMongoId()
        .withMessage("redirect.refId must be a valid MongoDB ObjectId"),
    body("redirect.url")
        .optional({
        nullable: true,
        checkFalsy: true,
    })
        .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
    })
        .withMessage("redirect.url must be a valid HTTP or HTTPS URL"),
    body("redirect").custom((redirect) => {
        if (!redirect) {
            return true;
        }
        const type = redirect.type ?? "NONE";
        if (["SERVICE", "PACKAGE", "CATEGORY", "PRODUCT"].includes(type) &&
            !redirect.refId) {
            throw new Error("redirect.refId is required for this redirect type");
        }
        if (type === "URL" && !redirect.url) {
            throw new Error("redirect.url is required when redirect type is URL");
        }
        return true;
    }),
];
const createBannerValidation = [
    body("name")
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ max: 120 })
        .withMessage("Name cannot exceed 120 characters"),
    body("placement")
        .notEmpty()
        .withMessage("Placement is required")
        .isIn(PLACEMENTS)
        .withMessage("Invalid placement"),
    body("format")
        .notEmpty()
        .withMessage("Format is required")
        .isIn(FORMATS)
        .withMessage("Invalid format"),
    body("image")
        .isString()
        .withMessage("Image must be a string")
        .trim()
        .notEmpty()
        .withMessage("Image is required")
        .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
    })
        .withMessage("Image must be a valid HTTP or HTTPS URL"),
    body("description")
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters"),
    body("buttonText")
        .optional()
        .isString()
        .withMessage("buttonText must be a string")
        .trim()
        .isLength({ max: 80 })
        .withMessage("buttonText cannot exceed 80 characters"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer")
        .toInt(),
    ...redirectValidation,
    validateRequest,
];
const updateBannerValidation = [
    param("id").isMongoId().withMessage("Invalid banner ID"),
    body().custom((value) => {
        if (!value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            Object.keys(value).length === 0) {
            throw new Error("At least one field is required for update");
        }
        return true;
    }),
    body("name")
        .optional()
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ max: 120 })
        .withMessage("Name cannot exceed 120 characters"),
    body("placement")
        .optional()
        .isIn(PLACEMENTS)
        .withMessage("Invalid placement"),
    body("format").optional().isIn(FORMATS).withMessage("Invalid format"),
    body("image")
        .optional()
        .isString()
        .withMessage("Image must be a string")
        .trim()
        .notEmpty()
        .withMessage("Image cannot be empty")
        .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
    })
        .withMessage("Image must be a valid HTTP or HTTPS URL"),
    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .notEmpty()
        .withMessage("Description cannot be empty")
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters"),
    body("buttonText")
        .optional()
        .isString()
        .withMessage("buttonText must be a string")
        .trim()
        .isLength({ max: 80 })
        .withMessage("buttonText cannot exceed 80 characters"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer")
        .toInt(),
    ...redirectValidation,
    validateRequest,
];
const listBannerValidation = [
    query("placement")
        .optional()
        .isIn(PLACEMENTS)
        .withMessage("Invalid placement"),
    query("format").optional().isIn(FORMATS).withMessage("Invalid format"),
    query("redirectType")
        .optional()
        .isIn(REDIRECT_TYPES)
        .withMessage("Invalid redirect type"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validateRequest,
];
const router = Router();
router.get("/", listBannerValidation, getAllBanners);
router.get("/:id", authenticate, bannerIdValidation, getBannerById);
router.post("/", authenticate, createBannerValidation, createBanner);
router.put("/:id", authenticate, updateBannerValidation, updateBanner);
router.patch("/:id/status", authenticate, bannerIdValidation, toggleBannerStatus);
router.delete("/:id", authenticate, bannerIdValidation, deleteBanner);
export default router;
//# sourceMappingURL=banner.routes.js.map