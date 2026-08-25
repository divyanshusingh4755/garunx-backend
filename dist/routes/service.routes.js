import { Router } from "express";
import { body, param, query } from "express-validator";
import { getAllServices, createService, updateService, getServiceById, toggleServiceStatus, getFullService, updateServiceLocations, removeServiceLocation, updateServiceTiers, removeServiceTier, getServicesByLocation, getFullServiceByCities, getServiceDiagnostics, getAllServicesAdmin, exportServicesCsv, getFullServiceAdmin } from "../controllers/service.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";
const router = Router();
const serviceIdValidation = [
    param("serviceId").isMongoId().withMessage("Invalid service ID"),
    validate,
];
const serviceValidation = [
    body("name").isString().withMessage("Name must be a string").trim().notEmpty().withMessage("Name is required"),
    body("shortDescription").isString().withMessage("Short description must be a string").trim().notEmpty().withMessage("Short description is required").isLength({ max: 200 }).withMessage("Short description max length is 200"),
    body("fullDescription").isString().withMessage("Full description must be a string").trim().notEmpty().withMessage("Full description is required"),
    body("categoryId").notEmpty().withMessage("Category ID is required").isMongoId().withMessage("Invalid category ID"),
    body("thumbnailImage").notEmpty().withMessage("Thumbnail image is required").isURL().withMessage("Thumbnail image must be valid URL"),
    body("bannerImage").optional({ values: "falsy" }).isURL().withMessage("Banner image must be valid URL"),
    validate,
];
const updateServiceValidation = [
    param("serviceId").isMongoId().withMessage("Invalid service ID"),
    body().custom((value) => {
        const allowedFields = ["name", "shortDescription", "fullDescription", "categoryId", "thumbnailImage", "bannerImage",];
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
    body("name").optional().isString().withMessage("Name must be a string").trim().notEmpty().withMessage("Name cannot be empty"),
    body("shortDescription").optional().isString().withMessage("Short description must be a string").trim().notEmpty().withMessage("Short description cannot be empty").isLength({ max: 200 }).withMessage("Short description max length is 200"),
    body("fullDescription").optional().isString().withMessage("Full description must be a string").trim().notEmpty().withMessage("Full description cannot be empty"),
    body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    body("thumbnailImage").optional().isURL().withMessage("Thumbnail image must be valid URL"),
    body("bannerImage").optional({ values: "falsy" }).isURL().withMessage("Banner image must be valid URL"),
    validate,
];
const serviceStatusValidation = [
    param("serviceId").isMongoId().withMessage("Invalid service ID"),
    body("isActive").exists({ checkNull: true }).withMessage("isActive is required").isBoolean().withMessage("isActive must be boolean").toBoolean(),
    body("confirmed").optional().isBoolean().withMessage("confirmed must be boolean").toBoolean(),
    validate,
];
const updateLocationsValidation = [
    param("id").isMongoId().withMessage("Invalid service ID"),
    body("locations").isArray({ min: 1 }).withMessage("locations array is required"),
    body("locations.*.locationId").notEmpty().withMessage("Location ID is required").isMongoId().withMessage("Invalid location ID"),
    body("locations.*").custom((value) => {
        const allowedFields = ["locationId",];
        const invalidFields = Object.keys(value ?? {}).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid location fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
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
    body("tiers.*.tierId").notEmpty().withMessage("Tier ID is required").isMongoId().withMessage("Invalid tier ID"),
    body("tiers.*").custom((value) => {
        const allowedFields = ["tierId",];
        const invalidFields = Object.keys(value ?? {}).filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid tier fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    validate,
];
const removeTierValidation = [
    param("id").isMongoId().withMessage("Invalid service ID"),
    param("tierId").isMongoId().withMessage("Invalid tier ID"),
    validate,
];
const fullServiceByCitiesValidation = [
    param("serviceId").isMongoId().withMessage("Invalid service ID"),
    body("cityIds").isArray({ min: 1 }).withMessage("cityIds must be a non-empty array"),
    body("cityIds.*").isMongoId().withMessage("Each city ID must be valid"),
    validate,
];
const servicesByLocationValidation = [
    query("cityIds").optional().custom((value) => {
        const ids = String(value).split(",").map((id) => id.trim()).filter(Boolean);
        if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
            throw new Error("One or more city IDs are invalid");
        }
        return true;
    }),
    query("categoryIds").optional().custom((value) => {
        const ids = String(value).split(",").map((id) => id.trim()).filter(Boolean);
        if (ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
            throw new Error("One or more category IDs are invalid");
        }
        return true;
    }),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be at least 1"),
    query("sortBy").optional().isIn(["name", "createdAt", "updatedAt", "startingPrice",]).withMessage("Invalid sortBy value"),
    query("sortOrder").optional().isIn(["asc", "desc",]).withMessage("sortOrder must be asc or desc"),
    validate,
];
const publicServiceListValidation = [
    query("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    query("locationId").optional().isMongoId().withMessage("Invalid location ID"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be at least 1"),
    query("sortBy").optional().isIn(["name", "createdAt", "updatedAt", "startingPrice", "relevance",]).withMessage("Invalid sortBy value"),
    query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
    validate,
];
const adminServiceListValidation = [
    query("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    query("locationId").optional().isMongoId().withMessage("Invalid location ID"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be at least 1"),
    query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
    query("isComplete").optional().isBoolean().withMessage("isComplete must be true or false"),
    query("sortBy").optional().isIn(["name", "createdAt", "updatedAt", "startingPrice", "isActive", "isComplete", "relevance",]).withMessage("Invalid sortBy value"),
    query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
    validate,
];
const exportServicesValidation = [
    body("serviceIds").isArray({ min: 1, max: 1000 }).withMessage("serviceIds must contain between 1 and 1000 service IDs"),
    body("serviceIds.*").isMongoId().withMessage("Each serviceId must be a valid MongoDB ID"),
    validate,
];
// PUBLIC / USER - STATIC ROUTES
router.get("/", publicServiceListValidation, getAllServices);
router.get("/getServicesByLocation", servicesByLocationValidation, getServicesByLocation);
// ADMIN - STATIC ROUTES
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.read"), adminServiceListValidation, getAllServicesAdmin);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.export"), exportServicesValidation, exportServicesCsv);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.create"), serviceValidation, createService);
// ADMIN - PREFIXED SERVICE ROUTES
router.get("/admin/:serviceId/full", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.read"), serviceIdValidation, getFullServiceAdmin);
// SERVICE - SPECIFIC READ / ACTION ROUTES
router.get("/:serviceId/full", serviceIdValidation, getFullService);
router.post("/:serviceId/getFullServiceByCities", fullServiceByCitiesValidation, getFullServiceByCities);
router.get("/:serviceId/diagnostics", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.diagnostics"), serviceIdValidation, getServiceDiagnostics);
// SERVICE - LOCATION MANAGEMENT
router.post("/:id/locations", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.manage_locations"), updateLocationsValidation, updateServiceLocations);
router.delete("/:id/locations/:locationId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.manage_locations"), removeLocationValidation, removeServiceLocation);
// SERVICE - TIER MANAGEMENT
router.post("/:id/tiers", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.manage_tiers"), updateTiersValidation, updateServiceTiers);
router.delete("/:id/tiers/:tierId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.manage_tiers"), removeTierValidation, removeServiceTier);
// SERVICE - STATUS
router.patch("/:serviceId/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.status"), serviceStatusValidation, toggleServiceStatus);
// SERVICE - GENERIC ID ROUTES
// Keep these last.
router.get("/:serviceId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.read"), serviceIdValidation, getServiceById);
router.patch("/:serviceId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("service.update"), updateServiceValidation, updateService);
export default router;
//# sourceMappingURL=service.routes.js.map