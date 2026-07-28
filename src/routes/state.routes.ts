import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  createState,
  deleteState,
  getAllState,
  getStateById,
  updateState,
} from "../controllers/state.controllers.js";

const router = Router();

const validate = (
  req: any,
  res: any,
  next: any,
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message:
        errors.array()[0]?.msg ??
        "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

const createStateValidation = [
  body("country")
    .notEmpty()
    .withMessage("country is required")
    .isString()
    .trim(),

  body("name")
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .trim(),

  body("gstCode")
    .notEmpty()
    .withMessage("gstCode is required")
    .matches(/^\d{2}$/)
    .withMessage(
      "gstCode must contain exactly 2 digits",
    ),

  body("image")
    .optional()
    .isURL()
    .withMessage(
      "Image must be a valid URL",
    ),

  body("description")
    .optional()
    .isString()
    .trim(),

  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Coordinates must be [longitude, latitude]",
    ),

  validate,
];

const updateStateValidation = [
  body("country")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage(
      "country cannot be empty",
    ),

  body("name")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage(
      "name cannot be empty",
    ),

  body("gstCode")
    .optional()
    .matches(/^\d{2}$/)
    .withMessage(
      "gstCode must contain exactly 2 digits",
    ),

  body("image")
    .optional({ nullable: true })
    .isURL()
    .withMessage(
      "Image must be a valid URL",
    ),

  body("description")
    .optional({ nullable: true })
    .isString()
    .trim(),

  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Coordinates must be [longitude, latitude]",
    ),

  validate,
];

// --- 2. State Routes ---
router.get("/get-all-state", getAllState); // Specific first
router.post("/create-state", authenticate, createStateValidation, createState);
router.patch("/update-state/:id", authenticate, updateStateValidation, updateState);
router.get("/:id", authenticate, getStateById); // Dynamic last
router.patch("/:id/status", authenticate, deleteState);
export default router;
