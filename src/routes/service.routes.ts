import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { body, param, query, validationResult } from "express-validator";

import {
  getAllServices,
  createService,
  updateService,
  getServiceById,
  toggleServiceStatus,
  getFullService,
  updateServiceLocations,
  removeServiceLocation,
  updateServiceTiers,
  removeServiceTier,
  getServicesByLocation,
  getFullServiceByCities,
  getServiceDiagnostics,
  getAllServicesAdmin,
} from "../controllers/service.controllers.js";

import { authenticate } from "../middleware/authenticate.js";
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

const serviceIdValidation = [
  param("serviceId").isMongoId().withMessage("Invalid service ID"),

  validate,
];

const serviceValidation = [
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
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("Banner image must be valid URL"),

  body("locations").optional().isArray().withMessage("locations must be array"),

  body("locations.*.name")
    .optional()
    .isString()
    .withMessage("Location name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Location name cannot be empty"),

  body("locations.*.locationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid location ID"),

  body("locations.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("Location isActive must be boolean"),

  body("tiers").optional().isArray().withMessage("tiers must be array"),

  body("tiers.*.name")
    .optional()
    .isString()
    .withMessage("Tier name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Tier name cannot be empty"),

  body("tiers.*.tierId").optional().isMongoId().withMessage("Invalid tier ID"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validate,
];

const updateServiceValidation = [
  param("serviceId").isMongoId().withMessage("Invalid service ID"),

  body().custom((value) => {
    const allowedFields = [
      "name",
      "shortDescription",
      "fullDescription",
      "categoryId",
      "thumbnailImage",
      "bannerImage",
    ];

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
    .withMessage("Name must be a string")
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),

  body("shortDescription")
    .optional()
    .isString()
    .withMessage("Short description must be a string")
    .trim()
    .notEmpty()
    .withMessage("Short description cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Short description max length is 200"),

  body("fullDescription")
    .optional()
    .isString()
    .withMessage("Full description must be a string")
    .trim()
    .notEmpty()
    .withMessage("Full description cannot be empty"),

  body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),

  body("thumbnailImage")
    .optional()
    .isURL()
    .withMessage("Thumbnail image must be valid URL"),

  body("bannerImage")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("Banner image must be valid URL"),

  validate,
];

const serviceStatusValidation = [
  param("serviceId").isMongoId().withMessage("Invalid service ID"),

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

const updateLocationsValidation = [
  param("id").isMongoId().withMessage("Invalid service ID"),

  body("locations")
    .isArray({ min: 1 })
    .withMessage("locations array is required"),

  body("locations.*.name")
    .optional()
    .isString()
    .withMessage("Location name must be a string")
    .trim(),

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
  param("id").isMongoId().withMessage("Invalid service ID"),

  param("locationId").isMongoId().withMessage("Invalid location ID"),

  validate,
];

const updateTiersValidation = [
  param("id").isMongoId().withMessage("Invalid service ID"),

  body("tiers").isArray({ min: 1 }).withMessage("tiers array is required"),

  body("tiers.*.name")
    .optional()
    .isString()
    .withMessage("Tier name must be a string")
    .trim(),

  body("tiers.*.tierId")
    .notEmpty()
    .withMessage("Tier ID is required")
    .isMongoId()
    .withMessage("Invalid tier ID"),

  validate,
];

const removeTierValidation = [
  param("id").isMongoId().withMessage("Invalid service ID"),

  param("tierId").isMongoId().withMessage("Invalid tier ID"),

  validate,
];

const fullServiceByCitiesValidation = [
  param("serviceId").isMongoId().withMessage("Invalid service ID"),

  body("cityIds")
    .isArray({ min: 1 })
    .withMessage("cityIds must be a non-empty array"),

  body("cityIds.*").isMongoId().withMessage("Each city ID must be valid"),

  validate,
];

const listValidation = [
  query("categoryId").optional().isMongoId().withMessage("Invalid category ID"),

  query("locationId").optional().isMongoId().withMessage("Invalid location ID"),

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

  query("isComplete")
    .optional()
    .isBoolean()
    .withMessage("isComplete must be true or false"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "createdAt",
      "updatedAt",
      "startingPrice",
      "isActive",
      "isComplete",
      "relevance",
    ])
    .withMessage("Invalid sortBy value"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  validate,
];

const servicesByLocationValidation = [
  query("cityIds")
    .optional()
    .custom((value) => {
      const ids = String(value)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
        throw new Error("One or more city IDs are invalid");
      }

      return true;
    }),

  query("categoryIds")
    .optional()
    .custom((value) => {
      const ids = String(value)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
        throw new Error("One or more category IDs are invalid");
      }

      return true;
    }),

  ...listValidation.filter((validator) => validator !== validate),

  validate,
];

const publicServiceListValidation = [
  query("categoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),

  query("locationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid location ID"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be at least 1"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "createdAt",
      "updatedAt",
      "startingPrice",
      "relevance",
    ])
    .withMessage("Invalid sortBy value"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  validate,
];

const adminServiceListValidation = [
  query("categoryId")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),

  query("locationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid location ID"),

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

  query("isComplete")
    .optional()
    .isBoolean()
    .withMessage("isComplete must be true or false"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "createdAt",
      "updatedAt",
      "startingPrice",
      "isActive",
      "isComplete",
      "relevance",
    ])
    .withMessage("Invalid sortBy value"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  validate,
];

router.get(
  "/",
  publicServiceListValidation,
  getAllServices,
);

router.get(
  "/getServicesByLocation",
  authenticate,
  authorizeRoles(Role.USER),
  servicesByLocationValidation,
  getServicesByLocation,
);

router.get(
  "/:serviceId/full",
  serviceIdValidation,
  getFullService,
);

router.post(
  "/:serviceId/getFullServiceByCities",
  fullServiceByCitiesValidation,
  getFullServiceByCities,
);

router.get(
  "/admin",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.read"),
  adminServiceListValidation,
  getAllServicesAdmin,
);

router.get(
  "/:serviceId/diagnostics",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.diagnostics"),
  serviceIdValidation,
  getServiceDiagnostics,
);

router.get(
  "/:serviceId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.read"),
  serviceIdValidation,
  getServiceById,
);

router.post(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.create"),
  serviceValidation,
  createService,
);

router.patch(
  "/:serviceId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.update"),
  updateServiceValidation,
  updateService,
);

router.patch(
  "/:serviceId/status",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.status"),
  serviceStatusValidation,
  toggleServiceStatus,
);

router.post(
  "/:id/locations",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.manage_locations"),
  updateLocationsValidation,
  updateServiceLocations,
);

router.delete(
  "/:id/locations/:locationId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.manage_locations"),
  removeLocationValidation,
  removeServiceLocation,
);

router.post(
  "/:id/tiers",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.manage_tiers"),
  updateTiersValidation,
  updateServiceTiers,
);

router.delete(
  "/:id/tiers/:tierId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("service.manage_tiers"),
  removeTierValidation,
  removeServiceTier,
);

export default router;
