import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { createState, deleteState, getAllState, getAllStatesAdmin, getStateById, updateState, } from "../controllers/state.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg ?? "Validation failed",
            errors: errors.array(),
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
const createStateValidation = [
    body("country")
        .isString()
        .withMessage("country must be a string")
        .trim()
        .notEmpty()
        .withMessage("country is required"),
    body("name")
        .isString()
        .withMessage("name must be a string")
        .trim()
        .notEmpty()
        .withMessage("name is required"),
    body("gstCode")
        .isString()
        .withMessage("gstCode must be a string")
        .trim()
        .matches(/^\d{2}$/)
        .withMessage("gstCode must contain exactly 2 digits"),
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
    validate,
];
const updateStateValidation = [
    param("id").isMongoId().withMessage("Invalid state ID"),
    body().custom((value) => {
        const allowedFields = [
            "country",
            "name",
            "gstCode",
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
    body("country")
        .optional()
        .isString()
        .withMessage("country must be a string")
        .trim()
        .notEmpty()
        .withMessage("country cannot be empty"),
    body("name")
        .optional()
        .isString()
        .withMessage("name must be a string")
        .trim()
        .notEmpty()
        .withMessage("name cannot be empty"),
    body("gstCode")
        .optional()
        .isString()
        .withMessage("gstCode must be a string")
        .trim()
        .matches(/^\d{2}$/)
        .withMessage("gstCode must contain exactly 2 digits"),
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
    validate,
];
const stateIdValidation = [
    param("id").isMongoId().withMessage("Invalid state ID"),
    validate,
];
const statusValidation = [
    param("id").isMongoId().withMessage("Invalid state ID"),
    body("status")
        .exists({ checkNull: true })
        .withMessage("status is required")
        .isBoolean()
        .withMessage("status must be a boolean"),
    validate,
];
const publicStateListValidation = [
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
        "gstCode",
        "createdAt",
        "updatedAt",
        "relevance",
    ])
        .withMessage("Invalid sortBy value"),
    validate,
];
const adminStateListValidation = [
    ...publicStateListValidation.slice(0, -1),
    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
    validate,
];
router.get("/get-all-state", publicStateListValidation, getAllState);
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("state.read"), adminStateListValidation, getAllStatesAdmin);
router.post("/create-state", authenticate, authorizeRoles(Role.ADMIN), requirePermission("state.create"), createStateValidation, createState);
router.patch("/update-state/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("state.update"), updateStateValidation, updateState);
router.get("/:id", authenticate, authorizeRoles(Role.ADMIN), requirePermission("state.read"), stateIdValidation, getStateById);
router.patch("/:id/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("state.status"), statusValidation, deleteState);
export default router;
//# sourceMappingURL=state.routes.js.map