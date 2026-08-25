import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { addRolePermissions, assignUserRoles, createPermission, createRole, exportRolesCsv, getPermissionById, getPermissions, getRoleById, getRoles, getUserAccess, removeAllUserRoles, removeRolePermission, removeUserRole, updatePermission, updatePermissionStatus, updateRole, updateRoleStatus } from "../controllers/rbac.controllers.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";
const createPermissionValidator = [
    body("name").trim().notEmpty().withMessage("Permission name is required").isLength({ min: 2, max: 100 }).withMessage("Permission name must be between 2 and 100 characters"),
    body("key").trim().notEmpty().withMessage("Permission key is required").matches(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/).withMessage("Permission key must follow module.action format, e.g. booking.refund"),
    body("module").trim().notEmpty().withMessage("Permission module is required").matches(/^[a-z][a-z0-9_-]*$/).withMessage("Permission module can contain lowercase letters, numbers, hyphens and underscores"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
    validate,
];
const getPermissionByIdValidator = [
    param("id").isMongoId().withMessage("Invalid permission ID"),
];
const getPermissionsValidator = [
    query("module").optional().trim().matches(/^[a-z][a-z0-9_-]*$/).withMessage("Invalid module"),
    query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be greater than 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    validate,
];
const updatePermissionValidator = [
    param("id").isMongoId().withMessage("Invalid permission ID"),
    body("name").optional().trim().notEmpty().withMessage("Permission name cannot be empty").isLength({ min: 2, max: 100 }).withMessage("Permission name must be between 2 and 100 characters"),
    body("key").optional().trim().matches(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/).withMessage("Permission key must follow module.action format, e.g. booking.refund"),
    body("module").optional().trim().matches(/^[a-z][a-z0-9_-]*$/).withMessage("Invalid permission module"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
    validate,
];
const updatePermissionStatusValidator = [
    param("id").isMongoId().withMessage("Invalid permission ID"),
    body("isActive").exists().withMessage("isActive is required").isBoolean().withMessage("isActive must be true or false"),
    validate,
];
const createRoleValidator = [
    body("name").trim().notEmpty().withMessage("Role name is required").isLength({ min: 2, max: 100 }).withMessage("Role name must be between 2 and 100 characters"),
    body("key").trim().notEmpty().withMessage("Role key is required").matches(/^[A-Z][A-Z0-9_]*$/).withMessage("Role key must contain only uppercase letters, numbers and underscores"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
    body("permissions").optional().isArray().withMessage("permissions must be an array"),
    body("permissions.*").optional().isMongoId().withMessage("Each permission must be a valid permission ID"),
    validate,
];
const getRolesValidator = [
    query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be greater than 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    validate,
];
const getRoleByIdValidator = [
    param("id").isMongoId().withMessage("Invalid role ID"),
    validate,
];
const updateRoleValidator = [
    param("id").isMongoId().withMessage("Invalid role ID"),
    body("name").optional().trim().notEmpty().withMessage("Role name cannot be empty").isLength({ min: 2, max: 100 }).withMessage("Role name must be between 2 and 100 characters"),
    body("key").optional().trim().matches(/^[A-Z][A-Z0-9_]*$/).withMessage("Role key must contain only uppercase letters, numbers and underscores"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
    validate,
];
const updateRoleStatusValidator = [
    param("id").isMongoId().withMessage("Invalid role ID"),
    body("isActive").exists().withMessage("isActive is required").isBoolean().withMessage("isActive must be true or false"),
    validate,
];
const addRolePermissionsValidator = [
    param("id").isMongoId().withMessage("Invalid role ID"),
    body("permissions").isArray({ min: 1 }).withMessage("permissions must be a non-empty array"),
    body("permissions.*").isMongoId().withMessage("Each permission must be a valid permission ID"),
    validate,
];
const removeRolePermissionValidator = [
    param("id").isMongoId().withMessage("Invalid role ID"),
    param("permissionId").isMongoId().withMessage("Invalid permission ID"),
    validate,
];
const assignUserRolesValidator = [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    body("roleIds").isArray({ min: 1 }).withMessage("roleIds must be a non-empty array"),
    body("roleIds.*").isMongoId().withMessage("Each roleId must be a valid role ID"),
    validate,
];
const removeAllUserRolesValidator = [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    validate,
];
const removeUserRoleValidator = [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    param("roleId").isMongoId().withMessage("Invalid role ID"),
    validate,
];
const getUserAccessValidator = [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    validate,
];
const exportRolesValidator = [
    body("roleIds").isArray({ min: 1, max: 100 }).withMessage("roleIds must be a non-empty array with maximum 100 roles"),
    body("roleIds.*").isMongoId().withMessage("Each roleId must be a valid role ID"),
    validate
];
const router = Router();
// ROLES - COLLECTION / STATIC ROUTES
router.post("/roles", authenticate, requirePermission("rbac.manage"), createRoleValidator, createRole);
router.post("/roles/export", authenticate, requirePermission("rbac.read"), exportRolesValidator, exportRolesCsv);
router.get("/roles", authenticate, requirePermission("rbac.read"), getRolesValidator, getRoles);
// PERMISSIONS - COLLECTION / STATIC ROUTES
router.post("/permissions", authenticate, requirePermission("rbac.manage"), createPermissionValidator, createPermission);
router.get("/permissions", authenticate, requirePermission("rbac.read"), getPermissionsValidator, getPermissions);
// USERS - RBAC ACCESS / ROLE MANAGEMENT
router.get("/users/:userId/access", authenticate, requirePermission("rbac.read"), getUserAccessValidator, getUserAccess);
router.put("/users/:userId/roles", authenticate, requirePermission("rbac.manage"), assignUserRolesValidator, assignUserRoles);
router.delete("/users/:userId/roles/:roleId", authenticate, requirePermission("rbac.manage"), removeUserRoleValidator, removeUserRole);
router.delete("/users/:userId/roles", authenticate, requirePermission("rbac.manage"), removeAllUserRolesValidator, removeAllUserRoles);
// ROLES - SPECIFIC NESTED ACTIONS
router.post("/roles/:id/permissions", authenticate, requirePermission("rbac.manage"), addRolePermissionsValidator, addRolePermissions);
router.delete("/roles/:id/permissions/:permissionId", authenticate, requirePermission("rbac.manage"), removeRolePermissionValidator, removeRolePermission);
router.patch("/roles/:id/status", authenticate, requirePermission("rbac.manage"), updateRoleStatusValidator, updateRoleStatus);
// PERMISSIONS - SPECIFIC ACTIONS
router.patch("/permissions/:id/status", authenticate, requirePermission("rbac.manage"), updatePermissionStatusValidator, updatePermissionStatus);
// ROLES - GENERIC ID ROUTES
router.get("/roles/:id", authenticate, requirePermission("rbac.read"), getRoleByIdValidator, getRoleById);
router.patch("/roles/:id", authenticate, requirePermission("rbac.manage"), updateRoleValidator, updateRole);
// PERMISSIONS - GENERIC ID ROUTES
router.get("/permissions/:id", authenticate, requirePermission("rbac.read"), getPermissionByIdValidator, getPermissionById);
router.patch("/permissions/:id", authenticate, requirePermission("rbac.manage"), updatePermissionValidator, updatePermission);
export default router;
//# sourceMappingURL=rbac.routes.js.map