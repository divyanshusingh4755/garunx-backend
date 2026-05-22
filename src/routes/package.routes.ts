import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { body, param, validationResult } from "express-validator";

import { authenticate } from "../middleware/authenticate.js";

import {
  getAllPackages,
  createPackage,
  updatePackage,
  getPackageById,
  togglePackageStatus,
  getFullPackage,
  updatePackageLocations,
  removePackageLocation,
  updatePackageTiers,
  removePackageTier,
  getPackageDiagnostics,
} from "../controllers/package.controllers.js";

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

const packageIdValidation = [
  param("packageId").isMongoId().withMessage("Invalid package ID"),

  validate,
];

const packageValidation = [
  body("name").notEmpty().withMessage("Name is required").isString().trim(),

  body("shortDescription")
    .notEmpty()
    .withMessage("Short description is required")
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Short description max length is 200"),

  body("fullDescription")
    .notEmpty()
    .withMessage("Full description is required")
    .isString()
    .trim(),

  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID"),

  body("thumbnailImage")
    .notEmpty()
    .withMessage("Thumbnail image is required")
    .isURL()
    .withMessage("Thumbnail image must be valid URL"),

  body("bannerImage")
    .optional()
    .isURL()
    .withMessage("Banner image must be valid URL"),

  body("locations").optional().isArray().withMessage("locations must be array"),

  body("locations.*.name").optional().isString().trim(),

  body("locations.*.locationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid location ID"),

  body("locations.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("Location isActive must be boolean"),

  body("tiers").optional().isArray().withMessage("tiers must be array"),

  body("tiers.*.name").optional().isString().trim(),

  body("tiers.*.tierId").optional().isMongoId().withMessage("Invalid tier ID"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

const updatePackageValidation = [
  param("packageId").isMongoId().withMessage("Invalid package ID"),

  body("name").optional().isString().trim(),

  body("shortDescription")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Short description max length is 200"),

  body("fullDescription").optional().isString().trim(),

  body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),

  body("thumbnailImage")
    .optional()
    .isURL()
    .withMessage("Thumbnail image must be valid URL"),

  body("bannerImage")
    .optional()
    .isURL()
    .withMessage("Banner image must be valid URL"),

  body("locations").optional().isArray().withMessage("locations must be array"),

  body("locations.*.locationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid location ID"),

  body("tiers").optional().isArray().withMessage("tiers must be array"),

  body("tiers.*.tierId").optional().isMongoId().withMessage("Invalid tier ID"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

const packageStatusValidation = [
  param("packageId").isMongoId().withMessage("Invalid package ID"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

const updateLocationsValidation = [
  param("id").isMongoId().withMessage("Invalid package ID"),

  body("locations")
    .isArray({ min: 1 })
    .withMessage("locations array is required"),

  body("locations.*.name").notEmpty().withMessage("Location name is required"),

  body("locations.*.locationId")
    .notEmpty()
    .withMessage("Location ID is required")
    .isMongoId()
    .withMessage("Invalid location ID"),

  body("locations.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

const removeLocationValidation = [
  param("id").isMongoId().withMessage("Invalid package ID"),

  param("locationId").isMongoId().withMessage("Invalid location ID"),

  validate,
];

const updateTiersValidation = [
  param("id").isMongoId().withMessage("Invalid package ID"),

  body("tiers").isArray({ min: 1 }).withMessage("tiers array is required"),

  body("tiers.*.name").notEmpty().withMessage("Tier name is required"),

  body("tiers.*.tierId")
    .notEmpty()
    .withMessage("Tier ID is required")
    .isMongoId()
    .withMessage("Invalid tier ID"),

  validate,
];

const removeTierValidation = [
  param("id").isMongoId().withMessage("Invalid package ID"),

  param("tierId").isMongoId().withMessage("Invalid tier ID"),

  validate,
];

router.get("/", getAllPackages);

router.get("/:packageId/full", packageIdValidation, getFullPackage);

router.get(
  "/:packageId/diagnostics",
  authenticate,
  packageIdValidation,
  getPackageDiagnostics,
);

router.get("/:packageId", packageIdValidation, getPackageById);

router.post("/", authenticate, packageValidation, createPackage);

router.patch(
  "/:packageId",
  authenticate,
  updatePackageValidation,
  updatePackage,
);

router.patch(
  "/:packageId/status",
  authenticate,
  packageStatusValidation,
  togglePackageStatus,
);

router.post(
  "/:id/locations",
  authenticate,
  updateLocationsValidation,
  updatePackageLocations,
);

router.delete(
  "/:id/locations/:locationId",
  authenticate,
  removeLocationValidation,
  removePackageLocation,
);

router.post(
  "/:id/tiers",
  authenticate,
  updateTiersValidation,
  updatePackageTiers,
);

router.delete(
  "/:id/tiers/:tierId",
  authenticate,
  removeTierValidation,
  removePackageTier,
);

export default router;
