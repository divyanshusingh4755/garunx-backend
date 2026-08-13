import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createCity, deleteCity, getAllCity, getCityById, updateCity, } from "../controllers/city.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { requirePermission } from "../middleware/rbac.js";
import { Role } from "../types/rbac.js";
const router = Router();
const handleValidationErrors = (req, res, next) => {
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
const locationValidation = [
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
        .custom((coordinates) => {
        if (coordinates.length !== 2 ||
            !coordinates.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) {
            throw new Error("Longitude and latitude must be valid numbers");
        }
        const [longitude, latitude] = coordinates;
        if (longitude < -180 || longitude > 180) {
            throw new Error("Longitude must be between -180 and 180");
        }
        if (latitude < -90 || latitude > 90) {
            throw new Error("Latitude must be between -90 and 90");
        }
        return true;
    }),
    body("location").custom((location) => {
        if (!location)
            return true;
        if (!location.type || !location.coordinates) {
            throw new Error("location.type and location.coordinates are required together");
        }
        return true;
    }),
];
const createCityValidation = [
    body("stateId")
        .notEmpty()
        .withMessage("stateId is required")
        .isMongoId()
        .withMessage("Invalid stateId"),
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
    body("image")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Image must be a valid URL"),
    body("description")
        .optional()
        .isString()
        .withMessage("description must be a string")
        .trim(),
    ...locationValidation,
    handleValidationErrors,
];
const updateCityValidation = [
    param("id").isMongoId().withMessage("Invalid city ID"),
    body().custom((value) => {
        const allowedFields = [
            "name",
            "country",
            "stateId",
            "image",
            "description",
            "location",
        ];
        const suppliedFields = Object.keys(value ?? {});
        if (suppliedFields.length === 0) {
            throw new Error("At least one update field is required");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("stateId").optional().isMongoId().withMessage("Invalid stateId"),
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
    body("image")
        .optional({ values: "falsy" })
        .isURL()
        .withMessage("Image must be a valid URL"),
    body("description")
        .optional()
        .isString()
        .withMessage("description must be a string")
        .trim(),
    ...locationValidation,
    handleValidationErrors,
];
const cityIdValidation = [
    param("id").isMongoId().withMessage("Invalid city ID"),
    handleValidationErrors,
];
const statusValidation = [
    param("id").isMongoId().withMessage("Invalid city ID"),
    body("status")
        .exists({ checkNull: true })
        .withMessage("status is required")
        .isBoolean()
        .withMessage("status must be a boolean"),
    handleValidationErrors,
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
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be asc or desc"),
    query("sortBy")
        .optional()
        .isIn(["name", "country", "createdAt", "updatedAt", "relevance"])
        .withMessage("Invalid sortBy value"),
    handleValidationErrors,
];
router.get("/get-all-city", listValidation, getAllCity);
router.post("/create-city", authenticate, authorizeRoles(Role.ADMIN), requirePermission("city.create"), createCityValidation, createCity);
router.patch("/update-city/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("city.update"), updateCityValidation, updateCity);
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("city.read"), cityIdValidation, getCityById);
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("city.status"), statusValidation, deleteCity);
export default router;
//# sourceMappingURL=city.routes.js.map