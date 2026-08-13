import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createSubServiceComponent, toggleSubServiceComponent, getAllSubServiceComponents, getSubServiceComponentById, updateSubServiceComponent, getAllSubServiceComponentsAdmin, } from "../controllers/subservices.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
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
const createSubServiceComponentValidation = [
    body("name")
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name is required"),
    body("description")
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),
    body("serviceId")
        .notEmpty()
        .withMessage("Service ID is required")
        .isMongoId()
        .withMessage("Invalid Service ID"),
    body("image")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Image must be a valid URL"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be boolean"),
    validate,
];
const updateSubServiceComponentValidation = [
    param("id").isMongoId().withMessage("Invalid ID"),
    body().custom((value) => {
        const allowedFields = [
            "name",
            "description",
            "serviceId",
            "image",
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
        .withMessage("Name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty"),
    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .notEmpty()
        .withMessage("Description cannot be empty"),
    body("serviceId").optional().isMongoId().withMessage("Invalid Service ID"),
    body("image")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Image must be a valid URL"),
    validate,
];
const idValidation = [
    param("id").isMongoId().withMessage("Invalid ID"),
    validate,
];
const statusValidation = [
    param("id").isMongoId().withMessage("Invalid ID"),
    body("status")
        .exists({ checkNull: true })
        .withMessage("status is required")
        .isBoolean()
        .withMessage("status must be boolean"),
    validate,
];
const publicListValidation = [
    query("serviceId")
        .optional()
        .custom((value) => {
        const ids = String(value)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
        if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
            throw new Error("One or more service IDs are invalid");
        }
        return true;
    }),
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
        .isBoolean()
        .withMessage("isActive must be true or false"),
    validate,
];
router.get("/", publicListValidation, getAllSubServiceComponents);
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("sub_service_component.read"), adminListValidation, getAllSubServiceComponentsAdmin);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("sub_service_component.create"), createSubServiceComponentValidation, createSubServiceComponent);
router.patch("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("sub_service_component.update"), updateSubServiceComponentValidation, updateSubServiceComponent);
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("sub_service_component.read"), idValidation, getSubServiceComponentById);
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("sub_service_component.status"), statusValidation, toggleSubServiceComponent);
export default router;
//# sourceMappingURL=subservices.routes.js.map