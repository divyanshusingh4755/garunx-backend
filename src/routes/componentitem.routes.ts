import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  createComponentItem,
  getAllComponentItems,
  getComponentItemById,
  updateComponentItem,
  updateComponentItemStatus,
} from "../controllers/componentItem.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
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
    .withMessage("price must be a non-negative number"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

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

    const invalidFields = suppliedFields.filter(
      (field) => !allowedFields.includes(field),
    );

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
    .withMessage("price must be a non-negative number"),

  validate,
];

const componentItemIdValidation = [
  param("componentItemId").isMongoId().withMessage("Invalid component item ID"),

  validate,
];

const componentItemStatusValidation = [
  param("componentItemId").isMongoId().withMessage("Invalid component item ID"),

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
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be at least 1"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),

  query("sortBy")
    .optional()
    .isIn(["name", "price", "isActive", "createdAt", "updatedAt", "relevance"])
    .withMessage("Invalid sortBy value"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  validate,
];

router.get(
  "/",
  listValidation,
  getAllComponentItems,
);

router.post(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("component_item.create"),
  componentItemValidation,
  createComponentItem,
);

router.put(
  "/:componentItemId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("component_item.update"),
  updateComponentItemValidation,
  updateComponentItem,
);

router.get(
  "/:componentItemId",
  componentItemIdValidation,
  getComponentItemById,
);

router.patch(
  "/:componentItemId/status",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("component_item.status"),
  componentItemStatusValidation,
  updateComponentItemStatus,
);

export default router;
