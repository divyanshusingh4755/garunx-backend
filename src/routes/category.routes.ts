import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllCategories, getCategoryById, createCategory, updateCategory, toggleCategoryStatus, deleteCategory, getAllCategoriesAdmin, exportCategoriesCsv } from "../controllers/category.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
import { validate } from "../utils/validate.js";

const router = Router();

const categoryIdValidation = [
  param("id").isMongoId().withMessage("Invalid category ID"),
  validate,
];

const categoryBodyValidation = [
  body("label").notEmpty().withMessage("label is required").isString().withMessage("label must be a string").trim(),
  body("value").notEmpty().withMessage("Value is required").isString().withMessage("Value must be a string").toLowerCase().trim().matches(/^[a-z0-9-]+$/).withMessage("value must be slug-friendly (lowercase, numbers and hyphens only)"),
  body("type").notEmpty().withMessage("Type is required").isIn(["service", "product"]).withMessage("Type must be either 'service' or 'product'"),
  body("image").optional({ checkFalsy: true }).isURL().withMessage("Image must be a valid URL"),
  body("description").optional().isString().trim(),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer").toInt(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean").toBoolean(),
  validate,
];

const categoryStatusValidation = [
  param("id").isMongoId().withMessage("Invalid category ID"),
  body("confirmed").optional().isBoolean().withMessage("confirmed must be a boolean").toBoolean(),
  validate,
];

const publicCategoryListValidation = [
  query("type").optional().isIn(["service", "product"]).withMessage("Type must be either 'service' or 'product'"),
  query("searchTerm").optional().isString().trim().isLength({ max: 100 }).withMessage("searchTerm cannot exceed 100 characters"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("sortBy").optional().isIn(["label", "value", "type", "displayOrder", "createdAt", "updatedAt", "relevance"]).withMessage("Invalid sortBy value"),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
  validate,];

const adminCategoryListValidation = [
  ...publicCategoryListValidation.slice(0, -1),
  query("isActive").optional().isIn(["true", "false"]).withMessage("isActive must be true or false"),
  validate,
];

const exportCategoriesValidation = [
  body("categoryIds").isArray({ min: 1, max: 1000, }).withMessage("categoryIds must contain between 1 and 1000 category IDs"),
  body("categoryIds.*").isMongoId().withMessage("Each categoryId must be a valid MongoDB ID"),
  validate,
];

// PUBLIC
// Active categories only
router.get("/", publicCategoryListValidation, getAllCategories);


// ADMIN - STATIC ROUTES
// Active / inactive / all categories
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.read"), adminCategoryListValidation, getAllCategoriesAdmin);

// Export selected categories
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.export"), exportCategoriesValidation, exportCategoriesCsv);

// Create category
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.create"), categoryBodyValidation, createCategory);

// ADMIN - SPECIFIC CATEGORY ACTIONS
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.status"), categoryStatusValidation, toggleCategoryStatus);

// ADMIN - GENERIC CATEGORY ID ROUTES
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.read"), categoryIdValidation, getCategoryById);
router.put("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.update"), categoryIdValidation.slice(0, -1), categoryBodyValidation, updateCategory);
router.delete("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("category.delete"), categoryIdValidation, deleteCategory);

export default router;