import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { createComponent, getAllComponents, getComponentById, updateComponent, toggleComponentStatus, } from "../controllers/component.controllers.js";
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
            message: firstError?.msg ?? "Validation failed",
            error: firstError,
        });
    }
    next();
};
const createComponentValidation = [
    body("name")
        .isString()
        .withMessage("Component name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Component name is required"),
    body("categoryId")
        .notEmpty()
        .withMessage("Category ID is required")
        .isMongoId()
        .withMessage("Invalid category ID"),
    body("description")
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),
    body("imageUrl")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Invalid image URL"),
    body("isRemovable")
        .optional()
        .isBoolean()
        .withMessage("isRemovable must be boolean"),
    body("isBundled")
        .optional()
        .isBoolean()
        .withMessage("isBundled must be boolean"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    validate,
];
const updateComponentValidation = [
    param("componentId").isMongoId().withMessage("Invalid component ID"),
    body().custom((value) => {
        const allowedFields = [
            "name",
            "categoryId",
            "description",
            "imageUrl",
            "isRemovable",
            "isBundled",
        ];
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
        .withMessage("name must be string")
        .trim()
        .notEmpty()
        .withMessage("name cannot be empty"),
    body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    body("description")
        .optional()
        .isString()
        .withMessage("description must be string")
        .trim()
        .notEmpty()
        .withMessage("description cannot be empty"),
    body("imageUrl")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Invalid image URL"),
    body("isRemovable")
        .optional()
        .isBoolean()
        .withMessage("isRemovable must be boolean"),
    body("isBundled")
        .optional()
        .isBoolean()
        .withMessage("isBundled must be boolean"),
    validate,
];
const componentIdValidation = [
    param("componentId").isMongoId().withMessage("Invalid component ID"),
    validate,
];
const componentStatusValidation = [
    param("componentId").isMongoId().withMessage("Invalid component ID"),
    body("isActive")
        .exists({ checkNull: true })
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be boolean"),
    body("confirmed")
        .optional()
        .isBoolean()
        .withMessage("confirmed must be boolean"),
    validate,
];
const listValidation = [
    query("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be at least 1"),
    query("isRemovable")
        .optional()
        .isBoolean()
        .withMessage("isRemovable must be true or false"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("isBundled")
        .optional()
        .isBoolean()
        .withMessage("isBundled must be true or false"),
    query("sortBy")
        .optional()
        .isIn([
        "name",
        "createdAt",
        "updatedAt",
        "isActive",
        "isRemovable",
        "isBundled",
        "relevance",
    ])
        .withMessage("Invalid sortBy value"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    validate,
];
router.get("/", listValidation, getAllComponents);
router.get("/:componentId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component.read"), componentIdValidation, getComponentById);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component.create"), createComponentValidation, createComponent);
router.patch("/:componentId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component.update"), updateComponentValidation, updateComponent);
router.patch("/:componentId/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("component.status"), componentStatusValidation, toggleComponentStatus);
export default router;
//# sourceMappingURL=component.routes.js.map