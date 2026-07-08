import {
  type Request,
  type Response,
  type NextFunction,
  Router,
} from "express";
import { body, validationResult } from "express-validator";

import { authenticate } from "../middleware/authenticate.js";

import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} from "../controllers/banner.controllers.js";

const PLACEMENTS = [
  "HOME_TOP",
  "HOME_MIDDLE",
  "HOME_BOTTOM",
  "CATEGORY",
  "PRODUCT",
] as const;

const FORMATS = ["WEB", "MOBILE", "BOTH"] as const;

const REDIRECT_TYPES = [
  "NONE",
  "SERVICE",
  "PACKAGE",
  "CATEGORY",
  "PRODUCT",
  "URL",
] as const;

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
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

const createBannerValidation = [
  body("name").notEmpty().withMessage("Name is required").isString().trim(),

  body("placement")
    .notEmpty()
    .withMessage("Placement is required")
    .isIn(PLACEMENTS)
    .withMessage("Invalid placement"),

  body("format")
    .notEmpty()
    .withMessage("Format is required")
    .isIn(FORMATS)
    .withMessage("Invalid format"),

  body("image")
    .notEmpty()
    .withMessage("Image is required")
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .trim(),

  body("buttonText")
    .optional()
    .isString()
    .trim(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer"),

  body("redirect.type")
    .optional()
    .isIn(REDIRECT_TYPES)
    .withMessage("Invalid redirect type"),

  body("redirect.refId")
    .optional()
    .isMongoId()
    .withMessage("redirect.refId must be a valid MongoDB ObjectId"),

  body("redirect.url")
    .optional()
    .isURL()
    .withMessage("redirect.url must be a valid URL"),

  validateRequest,
];

const updateBannerValidation = [
  body("name").optional().isString().trim(),

  body("placement")
    .optional()
    .isIn(PLACEMENTS)
    .withMessage("Invalid placement"),

  body("format")
    .optional()
    .isIn(FORMATS)
    .withMessage("Invalid format"),

  body("image")
    .optional()
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("description")
    .optional()
    .isString()
    .trim(),

  body("buttonText")
    .optional()
    .isString()
    .trim(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer"),

  body("redirect.type")
    .optional()
    .isIn(REDIRECT_TYPES)
    .withMessage("Invalid redirect type"),

  body("redirect.refId")
    .optional()
    .isMongoId()
    .withMessage("redirect.refId must be a valid MongoDB ObjectId"),

  body("redirect.url")
    .optional()
    .isURL()
    .withMessage("redirect.url must be a valid URL"),

  validateRequest,
];

const router = Router();

router.get("/", getAllBanners);
router.get("/:id", authenticate, getBannerById);

router.post("/", authenticate, createBannerValidation, createBanner);

router.put("/:id", authenticate, updateBannerValidation, updateBanner);

router.patch("/:id/status", authenticate, toggleBannerStatus);

router.delete("/:id", authenticate, deleteBanner);

export default router;
