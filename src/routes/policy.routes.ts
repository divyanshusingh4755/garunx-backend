import { Router } from "express";
import { body, param, query } from "express-validator";
import { createPolicy, updatePolicy, getAllPolicies, togglePolicyStatus, getPolicyByType, exportPoliciesCsv } from "../controllers/policy.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";

const router = Router();

const POLICY_TYPES = ["TERMS", "PRIVACY", "REFUND"] as const;
const USER_TYPES = ["User", "Coordinator"] as const;

const createPolicyValidation = [
  body("type").isIn(POLICY_TYPES).withMessage("Invalid policy type"),
  body("title").isString().withMessage("Title must be a string").trim().notEmpty().withMessage("Title is required"),
  body("content").isString().withMessage("Content must be a string").trim().notEmpty().withMessage("Content is required"),
  body("userType").isIn(USER_TYPES).withMessage("Invalid user type"),
  validate,
];

const updatePolicyValidation = [
  param("id").isMongoId().withMessage("Invalid policy id"),
  body().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Request body must be an object");
    }

    const allowedFields = ["title", "content",];
    const suppliedFields = Object.keys(value);

    if (suppliedFields.length === 0) {
      throw new Error("At least one field is required for update");
    }

    const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
    }

    return true;
  }),

  body("title").optional().isString().withMessage("Title must be a string").trim().notEmpty().withMessage("Title cannot be empty"),
  body("content").optional().isString().withMessage("Content must be a string").trim().notEmpty().withMessage("Content cannot be empty"),
  validate,
];

const statusValidation = [
  param("id").isMongoId().withMessage("Invalid policy id"),
  body("isActive").exists().withMessage("isActive is required").isBoolean().withMessage("isActive must be a boolean").toBoolean(),
  validate,
];

const getPoliciesValidation = [
  query("type").optional().isIn(POLICY_TYPES).withMessage("Invalid policy type"),
  query("userType").optional().isIn(USER_TYPES).withMessage("Invalid user type"),
  query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be greater than 0").toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
  validate,
];

const exportPoliciesValidation = [
  body("policyIds").isArray({ min: 1, max: 1000, }).withMessage("policyIds must contain between 1 and 1000 policy IDs"),
  body("policyIds.*").isMongoId().withMessage("Each policyId must be a valid MongoDB ID"),
  body("policyIds").custom((policyIds) => {
    if (!Array.isArray(policyIds)) { return true; }

    const uniqueIds = new Set(policyIds);
    if (uniqueIds.size !== policyIds.length) { throw new Error("Duplicate policy IDs are not allowed"); }
    return true;
  }),
  validate,
];

const getPolicyByTypeValidation = [
  param("type").isIn(POLICY_TYPES).withMessage("Invalid policy type"),
  query("userType").exists().withMessage("userType is required").isIn(USER_TYPES).withMessage("Invalid user type"),
  validate,
];

// ADMIN - STATIC ROUTES
router.get("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("policy.read"), getPoliciesValidation, getAllPolicies);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("policy.create"), createPolicyValidation, createPolicy);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("policy.read"), exportPoliciesValidation, exportPoliciesCsv);

// ADMIN - SPECIFIC POLICY ACTIONS
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("policy.status"), statusValidation, togglePolicyStatus);
router.put("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("policy.update"), updatePolicyValidation, updatePolicy);

// PUBLIC - POLICY BY TYPE
// Keep this dynamic route last.
router.get("/:type", getPolicyByTypeValidation, getPolicyByType);

export default router;