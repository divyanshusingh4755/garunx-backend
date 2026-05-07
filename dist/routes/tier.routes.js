import { Router, } from "express";
import { body, param, validationResult } from "express-validator";
import { createTier, getAllTier, getTierById, toggleTierStatus, updateTier, } from "../controllers/tier.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
const router = Router();
const createTierValidation = [
    body("name").notEmpty().withMessage("name is required").isString().trim(),
    body("tierReference").optional().isString().trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    (req, res, next) => {
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
    },
];
export const updateTierValidation = [
    param("id").isMongoId().withMessage("Invalid tier id"),
    body("name").optional().isString().trim().withMessage("name must be string"),
    body("tierReference").optional().isString().trim(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    (req, res, next) => {
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
    },
];
export const toggleTierStatusValidation = [
    param("id").isMongoId().withMessage("Invalid tier id"),
    body("isActive")
        .notEmpty()
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be boolean"),
    (req, res, next) => {
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
    },
];
router.get("/", getAllTier);
router.get("/:id", authenticate, getTierById);
router.post("/", authenticate, createTierValidation, createTier);
router.put("/:id", authenticate, updateTierValidation, updateTier);
router.patch("/:id/status", authenticate, toggleTierStatusValidation, toggleTierStatus);
export default router;
//# sourceMappingURL=tier.routes.js.map