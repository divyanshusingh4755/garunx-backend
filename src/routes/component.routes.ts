import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { body, param, validationResult } from "express-validator";

import {
  createComponent,
  getAllComponents,
  getComponentById,
  updateComponent,
  toggleComponentStatus,
} from "../controllers/component.controllers.js";

import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
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

const componentValidation = [
  body("name")
    .notEmpty()
    .withMessage("Component name is required")
    .isString()
    .trim(),

  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .trim(),

  body("imageUrl").optional().isURL().withMessage("Invalid image URL"),

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

  body("name").optional().isString().trim().withMessage("name must be string"),

  body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),

  body("description")
    .optional()
    .isString()
    .trim()
    .withMessage("description must be string"),

  body("imageUrl").optional().isURL().withMessage("Invalid image URL"),

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

const componentIdValidation = [
  param("componentId").isMongoId().withMessage("Invalid component ID"),

  validate,
];

const componentStatusValidation = [
  param("componentId").isMongoId().withMessage("Invalid component ID"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

// Get all components
router.get("/", getAllComponents);

// Get component by ID
router.get(
  "/:componentId",
  authenticate,
  componentIdValidation,
  getComponentById,
);

// Create component
router.post("/", authenticate, componentValidation, createComponent);

// Update component
router.patch(
  "/:componentId",
  authenticate,
  updateComponentValidation,
  updateComponent,
);

// Toggle component status
router.patch(
  "/:componentId/status",
  authenticate,
  componentStatusValidation,
  toggleComponentStatus,
);

export default router;
