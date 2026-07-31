import { Router, } from "express";
import { body, param, query, validationResult, } from "express-validator";
import { createTier, getAllTier, getTierById, toggleTierStatus, updateTier, } from "../controllers/tier.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
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
const tierIdValidation = [
    param("id").isMongoId().withMessage("Invalid tier id"),
    validate,
];
const createTierValidation = [
    body("name")
        .notEmpty()
        .withMessage("name is required")
        .isString()
        .withMessage("name must be string")
        .trim(),
    body("tierReference")
        .optional({ checkFalsy: true })
        .isString()
        .withMessage("tierReference must be string")
        .trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean")
        .toBoolean(),
    validate,
];
const updateTierValidation = [
    param("id").isMongoId().withMessage("Invalid tier id"),
    body("name")
        .optional()
        .isString()
        .withMessage("name must be string")
        .trim()
        .notEmpty()
        .withMessage("name cannot be empty"),
    body("tierReference")
        .optional({ nullable: true })
        .isString()
        .withMessage("tierReference must be string")
        .trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean")
        .toBoolean(),
    body().custom((payload) => {
        const allowedFields = [
            "name",
            "tierReference",
            "isActive",
        ];
        const hasUpdate = allowedFields.some((field) => payload[field] !== undefined);
        if (!hasUpdate) {
            throw new Error("At least one field is required");
        }
        return true;
    }),
    validate,
];
const toggleTierStatusValidation = [
    param("id").isMongoId().withMessage("Invalid tier id"),
    body("isActive")
        .exists({ checkNull: true })
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be boolean")
        .toBoolean(),
    body("confirmed")
        .optional()
        .isBoolean()
        .withMessage("confirmed must be boolean")
        .toBoolean(),
    validate,
];
const listTierValidation = [
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
router.get("/", listTierValidation, getAllTier);
router.get("/:id", authenticate, tierIdValidation, getTierById);
router.post("/", authenticate, createTierValidation, createTier);
router.put("/:id", authenticate, updateTierValidation, updateTier);
router.patch("/:id/status", authenticate, toggleTierStatusValidation, toggleTierStatus);
export default router;
//# sourceMappingURL=tier.routes.js.map