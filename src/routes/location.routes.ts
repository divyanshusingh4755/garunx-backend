import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  createLocation,
  deleteLocation,
  exportLocationsCsv,
  getAllLocation,
  getAllLocationsAdmin,
  getLocationById,
  getLocationIds,
  updateLocation,
} from "../controllers/location.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";

const router = Router();

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

const coordinatesValidation = [
  body("location")
    .optional()
    .isObject()
    .withMessage("location must be an object"),

  body("location.type")
    .optional()
    .equals("Point")
    .withMessage('location.type must be "Point"'),

  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be [longitude, latitude]")
    .custom((coordinates: unknown[]) => {
      if (
        coordinates.length !== 2 ||
        !coordinates.every(
          (coordinate) =>
            typeof coordinate === "number" && Number.isFinite(coordinate),
        )
      ) {
        throw new Error("Longitude and latitude must be valid numbers");
      }

      const [longitude, latitude] = coordinates as [number, number];

      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }

      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }

      return true;
    }),

  body("location").custom((location) => {
    if (!location) return true;

    if (!location.type || !location.coordinates) {
      throw new Error(
        "location.type and location.coordinates are required together",
      );
    }

    return true;
  }),
];

const createLocationValidation = [
  body("name")
    .isString()
    .withMessage("name must be a string")
    .trim()
    .notEmpty()
    .withMessage("name is required"),

  body("country")
    .isString()
    .withMessage("country must be a string")
    .trim()
    .notEmpty()
    .withMessage("country is required"),

  body("stateId")
    .notEmpty()
    .withMessage("stateId is required")
    .isMongoId()
    .withMessage("Invalid stateId"),

  body("cityId")
    .notEmpty()
    .withMessage("cityId is required")
    .isMongoId()
    .withMessage("Invalid cityId"),

  body("fullAddress")
    .isString()
    .withMessage("fullAddress must be a string")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Address is too short"),

  body("pincode")
    .isString()
    .withMessage("pincode must be a string")
    .trim()
    .isPostalCode("IN")
    .withMessage("Invalid Indian Pincode"),

  body("image")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("description")
    .optional()
    .isString()
    .withMessage("description must be a string")
    .trim(),

  ...coordinatesValidation,
  handleValidationErrors,
];

const updateLocationValidation = [
  param("id").isMongoId().withMessage("Invalid location ID"),

  body().custom((value) => {
    const allowedFields = [
      "name",
      "country",
      "stateId",
      "cityId",
      "fullAddress",
      "pincode",
      "image",
      "description",
      "location",
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
    .withMessage("name must be a string")
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty"),

  body("country")
    .optional()
    .isString()
    .withMessage("country must be a string")
    .trim()
    .notEmpty()
    .withMessage("country cannot be empty"),

  body("stateId").optional().isMongoId().withMessage("Invalid stateId"),

  body("cityId").optional().isMongoId().withMessage("Invalid cityId"),

  body("fullAddress")
    .optional()
    .isString()
    .withMessage("fullAddress must be a string")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Address is too short"),

  body("pincode")
    .optional()
    .isString()
    .withMessage("pincode must be a string")
    .trim()
    .isPostalCode("IN")
    .withMessage("Invalid Indian Pincode"),

  body("image")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("description")
    .optional()
    .isString()
    .withMessage("description must be a string")
    .trim(),

  ...coordinatesValidation,
  handleValidationErrors,
];

const locationIdValidation = [
  param("id").isMongoId().withMessage("Invalid location ID"),
  handleValidationErrors,
];

const statusValidation = [
  param("id").isMongoId().withMessage("Invalid location ID"),

  body("status")
    .exists({ checkNull: true })
    .withMessage("status is required")
    .isBoolean()
    .withMessage("status must be a boolean")
    .toBoolean(),

  body("confirmed")
    .optional()
    .isBoolean()
    .withMessage("confirmed must be a boolean")
    .toBoolean(),

  handleValidationErrors,
];

const locationIdsValidation = [
  body("locationIds")
    .isArray({ min: 1 })
    .withMessage("locationIds must be a non-empty array"),

  body("locationIds.*")
    .isMongoId()
    .withMessage("Each location ID must be valid"),

  handleValidationErrors,
];

const publicListValidation = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be at least 1"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "country",
      "pincode",
      "createdAt",
      "updatedAt",
      "relevance",
    ])
    .withMessage("Invalid sortBy value"),

  handleValidationErrors,
];

const adminListValidation = [
  ...publicListValidation.slice(0, -1),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),

  handleValidationErrors,
];

const exportLocationsValidation = [
  body("locationIds")
    .isArray({ min: 1, max: 1000 })
    .withMessage(
      "locationIds must contain between 1 and 1000 location IDs",
    ),

  body("locationIds.*")
    .isMongoId()
    .withMessage(
      "Each locationId must be a valid MongoDB ID",
    ),

  handleValidationErrors,
];

// =========================================================
// PUBLIC
// =========================================================

router.get(
  "/get-all-location",
  publicListValidation,
  getAllLocation,
);

router.post(
  "/get-location-by-ids",
  locationIdsValidation,
  getLocationIds,
);


// =========================================================
// ADMIN - STATIC ROUTES
// =========================================================

router.get(
  "/admin",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.read"),
  adminListValidation,
  getAllLocationsAdmin,
);

router.post(
  "/export-locations",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.export"),
  exportLocationsValidation,
  exportLocationsCsv,
);

router.post(
  "/create-location",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.create"),
  createLocationValidation,
  createLocation,
);


// =========================================================
// ADMIN - PREFIXED LOCATION ACTIONS
// =========================================================

router.patch(
  "/update-location/:id",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.update"),
  updateLocationValidation,
  updateLocation,
);


// =========================================================
// ADMIN - SPECIFIC ID ACTIONS
// =========================================================

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.status"),
  statusValidation,
  deleteLocation,
);


// =========================================================
// ADMIN - GENERIC LOCATION DETAIL
// Keep this last among dynamic GET routes.
// =========================================================

router.get(
  "/:id",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("location.read"),
  locationIdValidation,
  getLocationById,
);


export default router;