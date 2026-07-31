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
  getPackagesByLocation,
  getFullPackageByCities,
  getRelatedPackageService,
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

const relatedServiceValidation = [
  param("packageId").isMongoId().withMessage("Invalid package ID"),
  param("tierId").isMongoId().withMessage("Invalid tier ID"),
  param("locationId").isMongoId().withMessage("Invalid location ID"),
  validate,
];

const packageValidation = [
  body("name")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("shortDescription")
    .isString()
    .withMessage("Short description must be a string")
    .trim()
    .notEmpty()
    .withMessage("Short description is required")
    .isLength({ max: 200 })
    .withMessage("Short description max length is 200"),

  body("fullDescription")
    .isString()
    .withMessage("Full description must be a string")
    .trim()
    .notEmpty()
    .withMessage("Full description is required"),

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
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("Banner image must be valid URL"),

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
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("Banner image must be valid URL"),

  validate,
];

const packageStatusValidation = [
  param("packageId").isMongoId().withMessage("Invalid package ID"),

  body("isActive")
    .exists({ checkNull: true })
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

  body("locations.*.locationId")
    .notEmpty()
    .withMessage("Location ID is required")
    .isMongoId()
    .withMessage("Invalid location ID"),

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

router.get("/getPackagesByLocation", authenticate, getPackagesByLocation);

router.post(
  "/:packageId/getFullPackagesByCities",
  packageIdValidation,
  getFullPackageByCities,
);

router.get("/:packageId/full", packageIdValidation, getFullPackage);

router.get(
  "/:packageId/:tierId/:locationId/relatedService",
  relatedServiceValidation,
  getRelatedPackageService,
);

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
