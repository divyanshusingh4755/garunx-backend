import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { createTier, exportTiersCsv, getAllTier, getAllTierAdmin, getTierById, toggleTierStatus, updateTier, } from "../controllers/tier.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
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
    body().custom((payload) => {
        const allowedFields = [
            "name",
            "tierReference",
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
const publicTierListValidation = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validate,
];
const adminTierListValidation = [
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
    query("sortBy")
        .optional()
        .isIn([
        "name",
        "tierReference",
        "isActive",
        "createdAt",
        "updatedAt",
        "relevance",
    ])
        .withMessage("Invalid sortBy value"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validate,
];
const exportTiersValidation = [
    body("tierIds")
        .isArray({ min: 1, max: 1000 })
        .withMessage("tierIds must contain between 1 and 1000 tier IDs"),
    body("tierIds.*")
        .isMongoId()
        .withMessage("Each tierId must be a valid MongoDB ID"),
    validate,
];
// =========================================================
// PUBLIC
// =========================================================
router.get("/", publicTierListValidation, getAllTier);
// =========================================================
// ADMIN - STATIC ROUTES
// =========================================================
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.read"), adminTierListValidation, getAllTierAdmin);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.export"), exportTiersValidation, exportTiersCsv);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.create"), createTierValidation, createTier);
// =========================================================
// ADMIN - SPECIFIC ID ACTIONS
// =========================================================
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.status"), toggleTierStatusValidation, toggleTierStatus);
// =========================================================
// ADMIN - GENERIC ID ROUTES
// Keep these after more-specific /:id/... routes.
// =========================================================
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.read"), tierIdValidation, getTierById);
router.put("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("tier.update"), updateTierValidation, updateTier);
export default router;
//# sourceMappingURL=tier.routes.js.map