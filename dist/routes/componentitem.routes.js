import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createComponentItem, exportComponentItemsCsv, getAllComponentItems, getAllComponentItemsAdmin, getComponentItemById, getComponentItemByIdAdmin, updateComponentItem, updateComponentItemStatus, } from "../controllers/componentItem.controllers.js";
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
            message: firstError?.msg ?? "Validation failed",
            error: firstError,
        });
    }
    next();
};
export const componentItemValidation = [
    body("name")
        .isString()
        .withMessage("name must be a string")
        .trim()
        .notEmpty()
        .withMessage("name is required"),
    body("price")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("price must be a non-negative number")
        .toFloat(),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean")
        .toBoolean(),
    validate,
];
export const updateComponentItemValidation = [
    param("componentItemId").isMongoId().withMessage("Invalid component item ID"),
    body().custom((value) => {
        const allowedFields = ["name", "price"];
        const suppliedFields = Object.keys(value ?? {});
        if (suppliedFields.length === 0) {
            throw new Error("At least one update field is required");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("name")
        .optional()
        .isString()
        .withMessage("name must be a string")
        .trim()
        .notEmpty()
        .withMessage("name cannot be empty"),
    body("price")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("price must be a non-negative number")
        .toFloat(),
    validate,
];
const componentItemIdValidation = [
    param("componentItemId").isMongoId().withMessage("Invalid component item ID"),
    validate,
];
const componentItemStatusValidation = [
    param("componentItemId")
        .isMongoId()
        .withMessage("Invalid component item ID"),
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
const publicListValidation = [
    query("searchTerm")
        .optional()
        .isString()
        .withMessage("searchTerm must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("searchTerm cannot exceed 100 characters"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be at least 1"),
    query("sortBy")
        .optional()
        .isIn([
        "name",
        "price",
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
const adminListValidation = [
    ...publicListValidation.slice(0, -1),
    query("isActive")
        .optional()
        .isIn(["true", "false"])
        .withMessage("isActive must be true or false"),
    validate,
];
const exportComponentItemsValidation = [
    body("componentItemIds")
        .isArray({ min: 1, max: 1000 })
        .withMessage("componentItemIds must contain between 1 and 1000 component item IDs"),
    body("componentItemIds.*")
        .isMongoId()
        .withMessage("Each componentItemId must be a valid MongoDB ID"),
    validate,
];
// =========================================================
// PUBLIC
// =========================================================
router.get("/", publicListValidation, getAllComponentItems);
// =========================================================
// ADMIN - STATIC ROUTES
// =========================================================
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.read"), adminListValidation, getAllComponentItemsAdmin);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.export"), exportComponentItemsValidation, exportComponentItemsCsv);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.create"), componentItemValidation, createComponentItem);
// =========================================================
// ADMIN - PREFIXED DETAIL ROUTE
// Keep this before public /:componentItemId
// =========================================================
router.get("/admin/:componentItemId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.read"), componentItemIdValidation, getComponentItemByIdAdmin);
// =========================================================
// ADMIN - SPECIFIC COMPONENT ITEM ACTIONS
// =========================================================
router.patch("/:componentItemId/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.status"), componentItemStatusValidation, updateComponentItemStatus);
// =========================================================
// ADMIN - GENERIC UPDATE ROUTE
// =========================================================
router.put("/:componentItemId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component_item.update"), updateComponentItemValidation, updateComponentItem);
// =========================================================
// PUBLIC - GENERIC COMPONENT ITEM DETAIL
// Keep this last among dynamic GET routes.
// =========================================================
router.get("/:componentItemId", componentItemIdValidation, getComponentItemById);
export default router;
//# sourceMappingURL=componentitem.routes.js.map