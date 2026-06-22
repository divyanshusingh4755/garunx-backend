import { Router, } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllBanners, getBannerById, createBanner, updateBanner, toggleBannerStatus, deleteBanner, } from "../controllers/banner.controllers.js";
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
const createBannerValidation = [
    body("name").notEmpty().withMessage("Name is required").isString().trim(),
    body("placement")
        .notEmpty()
        .withMessage("Placement is required")
        .isIn(["HOME_TOP", "HOME_MIDDLE", "HOME_BOTTOM", "CATEGORY", "PRODUCT"])
        .withMessage("Invalid placement"),
    body("format")
        .notEmpty()
        .withMessage("Format is required")
        .isIn(["WEB", "MOBILE", "BOTH"])
        .withMessage("Invalid format"),
    body("images")
        .isArray({ min: 1 })
        .withMessage("At least one image is required"),
    body("images.*").isURL().withMessage("Each image must be a valid URL"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer"),
    validateRequest,
];
const updateBannerValidation = [
    body("name").optional().isString().trim(),
    body("placement")
        .optional()
        .isIn(["HOME_TOP", "HOME_MIDDLE", "HOME_BOTTOM", "CATEGORY", "PRODUCT"])
        .withMessage("Invalid placement"),
    body("format")
        .optional()
        .isIn(["WEB", "MOBILE", "BOTH"])
        .withMessage("Invalid format"),
    body("images")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Images must be an array"),
    body("images.*")
        .optional()
        .isURL()
        .withMessage("Each image must be a valid URL"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer"),
    validateRequest,
];
const router = Router();
router.get("/", getAllBanners);
router.get("/:id", authenticate, getBannerById);
router.post("/", authenticate, createBannerValidation, createBanner);
router.put("/:id", authenticate, updateBannerValidation, updateBanner);
router.patch("/:id/status", authenticate, toggleBannerStatus);
router.delete("/:id", authenticate, deleteBanner);
export default router;
//# sourceMappingURL=banner.routes.js.map