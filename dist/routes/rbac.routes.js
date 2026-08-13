import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { addRolePermissions, assignUserRoles, createPermission, createRole, getPermissionById, getPermissions, getRoleById, getRoles, getUserAccess, removeAllUserRoles, removeRolePermission, removeUserRole, updatePermission, updatePermissionStatus, updateRole, updateRoleStatus } from "../controllers/rbac.controllers.js";
import { requirePermission } from "../middleware/rbac.js";
const createPermissionValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Permission name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Permission name must be between 2 and 100 characters"),
    body("key")
        .trim()
        .notEmpty()
        .withMessage("Permission key is required")
        .matches(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/)
        .withMessage("Permission key must follow module.action format, e.g. booking.refund"),
    body("module")
        .trim()
        .notEmpty()
        .withMessage("Permission module is required")
        .matches(/^[a-z][a-z0-9_-]*$/)
        .withMessage("Permission module can contain lowercase letters, numbers, hyphens and underscores"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
];
const getPermissionByIdValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid permission ID"),
];
const getPermissionsValidator = [
    query("module")
        .optional()
        .trim()
        .matches(/^[a-z][a-z0-9_-]*$/)
        .withMessage("Invalid module"),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be greater than 0"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
];
const updatePermissionValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid permission ID"),
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Permission name cannot be empty")
        .isLength({ min: 2, max: 100 })
        .withMessage("Permission name must be between 2 and 100 characters"),
    body("key")
        .optional()
        .trim()
        .matches(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/)
        .withMessage("Permission key must follow module.action format, e.g. booking.refund"),
    body("module")
        .optional()
        .trim()
        .matches(/^[a-z][a-z0-9_-]*$/)
        .withMessage("Invalid permission module"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
];
const updatePermissionStatusValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid permission ID"),
    body("isActive")
        .exists()
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be true or false"),
];
const createRoleValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Role name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Role name must be between 2 and 100 characters"),
    body("key")
        .trim()
        .notEmpty()
        .withMessage("Role key is required")
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("Role key must contain only uppercase letters, numbers and underscores"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    body("permissions")
        .optional()
        .isArray()
        .withMessage("permissions must be an array"),
    body("permissions.*")
        .optional()
        .isMongoId()
        .withMessage("Each permission must be a valid permission ID"),
];
const getRolesValidator = [
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be greater than 0"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100"),
];
const getRoleByIdValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid role ID"),
];
const updateRoleValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid role ID"),
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Role name cannot be empty")
        .isLength({ min: 2, max: 100 })
        .withMessage("Role name must be between 2 and 100 characters"),
    body("key")
        .optional()
        .trim()
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("Role key must contain only uppercase letters, numbers and underscores"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
];
const updateRoleStatusValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid role ID"),
    body("isActive")
        .exists()
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be true or false"),
];
const addRolePermissionsValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid role ID"),
    body("permissions")
        .isArray({ min: 1 })
        .withMessage("permissions must be a non-empty array"),
    body("permissions.*")
        .isMongoId()
        .withMessage("Each permission must be a valid permission ID"),
];
const removeRolePermissionValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid role ID"),
    param("permissionId")
        .isMongoId()
        .withMessage("Invalid permission ID"),
];
const assignUserRolesValidator = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    body("roleIds")
        .isArray({ min: 1 })
        .withMessage("roleIds must be a non-empty array"),
    body("roleIds.*")
        .isMongoId()
        .withMessage("Each roleId must be a valid role ID"),
];
const removeAllUserRolesValidator = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
];
const removeUserRoleValidator = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    param("roleId")
        .isMongoId()
        .withMessage("Invalid role ID"),
];
const getUserAccessValidator = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
];
const router = Router();
router.post("/roles", authenticate, requirePermission("rbac.manage"), createRoleValidator, createRole);
router.post("/permissions", authenticate, requirePermission("rbac.manage"), createPermissionValidator, createPermission);
router.post("/roles/:id/permissions", authenticate, addRolePermissionsValidator, addRolePermissions);
router.get("/permissions", authenticate, requirePermission("rbac.read"), getPermissionsValidator, getPermissions);
router.get("/permissions/:id", authenticate, getPermissionByIdValidator, getPermissionById);
router.get("/roles", authenticate, requirePermission("rbac.read"), getRolesValidator, getRoles);
router.get("/roles/:id", authenticate, getRoleByIdValidator, getRoleById);
router.get("/users/:userId/access", authenticate, requirePermission("rbac.read"), getUserAccessValidator, getUserAccess);
router.patch("/permissions/:id", authenticate, updatePermissionValidator, requirePermission("rbac.manage"), updatePermission);
router.patch("/permissions/:id/status", authenticate, updatePermissionStatusValidator, updatePermissionStatus);
router.patch("/roles/:id", authenticate, updateRoleValidator, updateRole);
router.patch("/roles/:id/status", authenticate, updateRoleStatusValidator, updateRoleStatus);
router.put("/users/:userId/roles", authenticate, requirePermission("rbac.manage"), assignUserRolesValidator, assignUserRoles);
router.delete("/users/:userId/roles", authenticate, removeAllUserRolesValidator, removeAllUserRoles);
router.delete("/users/:userId/roles/:roleId", authenticate, removeUserRoleValidator, removeUserRole);
router.delete("/roles/:id/permissions/:permissionId", authenticate, removeRolePermissionValidator, removeRolePermission);
export default router;
//# sourceMappingURL=rbac.routes.js.map