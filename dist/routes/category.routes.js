import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllCategories, getCategoryById, createCategory, updateCategory, toggleCategoryStatus, deleteCategory, } from "../controllers/category.controllers.js";
const router = Router();
const validate = (req, res, next) => {
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
const categoryIdValidation = [
    param("id").isMongoId().withMessage("Invalid category ID"),
    validate,
];
const categoryBodyValidation = [
    body("label")
        .notEmpty()
        .withMessage("label is required")
        .isString()
        .withMessage("label must be a string")
        .trim(),
    body("value")
        .notEmpty()
        .withMessage("Value is required")
        .isString()
        .withMessage("Value must be a string")
        .toLowerCase()
        .trim()
        .matches(/^[a-z0-9-]+$/)
        .withMessage("value must be slug-friendly (lowercase, numbers and hyphens only)"),
    body("type")
        .notEmpty()
        .withMessage("Type is required")
        .isIn(["service", "product"])
        .withMessage("Type must be either 'service' or 'product'"),
    body("image")
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage("Image must be a valid URL"),
    body("description").optional().isString().trim(),
    body("displayOrder")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Display order must be a non-negative integer")
        .toInt(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean")
        .toBoolean(),
    validate,
];
const categoryStatusValidation = [
    param("id").isMongoId().withMessage("Invalid category ID"),
    body("confirmed")
        .optional()
        .isBoolean()
        .withMessage("confirmed must be a boolean")
        .toBoolean(),
    validate,
];
const listCategoryValidation = [
    query("type")
        .optional()
        .isIn(["service", "product"])
        .withMessage("Type must be either 'service' or 'product'"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer"),
    query("isActive")
        .optional()
        .isIn(["true", "false"])
        .withMessage("isActive must be true or false"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validate,
];
router.get("/", listCategoryValidation, getAllCategories);
router.get("/:id", authenticate, categoryIdValidation, getCategoryById);
router.post("/", authenticate, categoryBodyValidation, createCategory);
router.put("/:id", authenticate, categoryIdValidation.slice(0, -1), categoryBodyValidation, updateCategory);
router.patch("/:id/status", authenticate, categoryStatusValidation, toggleCategoryStatus);
router.delete("/:id", authenticate, categoryIdValidation, deleteCategory);
export default router;
//# sourceMappingURL=category.routes.js.map