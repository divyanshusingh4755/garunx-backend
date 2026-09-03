import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { getAllPackages, createPackage, updatePackage, getPackageById, togglePackageStatus, getFullPackage, updatePackageLocations, removePackageLocation, updatePackageTiers, removePackageTier, getPackageDiagnostics, getPackagesByLocation, getFullPackageByCities, getRelatedPackageService, getAllPackagesAdmin, exportPackagesToCsv, getFullPackageAdmin } from "../controllers/package.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";
const router = Router();
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
    body("name").isString().withMessage("Name must be a string").trim().notEmpty().withMessage("Name is required"),
    body("shortDescription").isString().withMessage("Short description must be a string").trim().notEmpty().withMessage("Short description is required").isLength({ max: 200 }).withMessage("Short description max length is 200"),
    body("fullDescription").isString().withMessage("Full description must be a string").trim().notEmpty().withMessage("Full description is required"),
    body("categoryId").notEmpty().withMessage("Category ID is required").isMongoId().withMessage("Invalid category ID"),
    body("thumbnailImage").notEmpty().withMessage("Thumbnail image is required").isURL().withMessage("Thumbnail image must be valid URL"),
    body("bannerImage").optional({ checkFalsy: true }).isURL().withMessage("Banner image must be valid URL"),
    body("commissionPercentage").optional().isFloat({ min: 0, max: 100 }).withMessage("Commission percentage must be between 0 and 100").toFloat(),
    validate,
];
const updatePackageValidation = [
    param("packageId").isMongoId().withMessage("Invalid package ID"),
    body("name").optional().isString().withMessage("Name must be a string").trim().notEmpty().withMessage("Name cannot be empty"),
    body("shortDescription").optional().isString().withMessage("Short description must be a string").trim().notEmpty().withMessage("Short description cannot be empty").isLength({ max: 200 }).withMessage("Short description max length is 200"),
    body("fullDescription").optional().isString().withMessage("Full description must be a string").trim().notEmpty().withMessage("Full description cannot be empty"),
    body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
    body("thumbnailImage").optional().isURL().withMessage("Thumbnail image must be valid URL"),
    body("bannerImage").optional({ checkFalsy: true }).isURL().withMessage("Banner image must be valid URL"),
    body("commissionPercentage").optional().isFloat({ min: 0, max: 100 }).withMessage("Commission percentage must be between 0 and 100").toFloat(),
    validate,
];
const packageStatusValidation = [
    param("packageId").isMongoId().withMessage("Invalid package ID"),
    body("isActive").exists({ checkNull: true }).withMessage("isActive is required").isBoolean().withMessage("isActive must be boolean").toBoolean(),
    validate,
];
const updateLocationsValidation = [
    param("id").isMongoId().withMessage("Invalid package ID"),
    body("locations").isArray({ min: 1 }).withMessage("locations array is required"),
    body("locations.*.locationId").notEmpty().withMessage("Location ID is required").isMongoId().withMessage("Invalid location ID"),
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
    body("tiers.*.tierId").notEmpty().withMessage("Tier ID is required").isMongoId().withMessage("Invalid tier ID"),
    validate,
];
const removeTierValidation = [
    param("id").isMongoId().withMessage("Invalid package ID"),
    param("tierId").isMongoId().withMessage("Invalid tier ID"),
    validate,
];
const exportPackagesValidation = [
    body("packageIds").isArray({ min: 1 }).withMessage("packageIds must be a non-empty array"),
    body("packageIds.*").isMongoId().withMessage("Each package ID must be valid"),
    validate,
];
// PUBLIC / GENERAL
router.get("/", getAllPackages);
router.get("/getPackagesByLocation", getPackagesByLocation);
// ADMIN - STATIC ROUTES
router.get("/admin", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.read"), getAllPackagesAdmin);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.read"), exportPackagesValidation, exportPackagesToCsv);
router.post("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.create"), packageValidation, createPackage);
// ADMIN - PREFIXED PACKAGE ROUTES
router.get("/admin/:packageId/full", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.read"), packageIdValidation, getFullPackageAdmin);
// PACKAGE - SPECIFIC READ ROUTES
router.get("/:packageId/diagnostics", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.diagnostics"), packageIdValidation, getPackageDiagnostics);
router.get("/:packageId/full", packageIdValidation, getFullPackage);
router.post("/:packageId/getFullPackagesByCities", packageIdValidation, getFullPackageByCities);
router.get("/:packageId/:tierId/:locationId/relatedService", relatedServiceValidation, getRelatedPackageService);
// PACKAGE - LOCATION MANAGEMENT
router.post("/:id/locations", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.manage_locations"), updateLocationsValidation, updatePackageLocations);
router.delete("/:id/locations/:locationId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.manage_locations"), removeLocationValidation, removePackageLocation);
// PACKAGE - TIER MANAGEMENT
router.post("/:id/tiers", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.manage_tiers"), updateTiersValidation, updatePackageTiers);
router.delete("/:id/tiers/:tierId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.manage_tiers"), removeTierValidation, removePackageTier);
// PACKAGE - STATUS / UPDATE
router.patch("/:packageId/status", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.status"), packageStatusValidation, togglePackageStatus);
router.patch("/:packageId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.update"), updatePackageValidation, updatePackage);
// GENERIC PACKAGE DETAIL
// Keep this after all more-specific /:packageId/... routes.
router.get("/:packageId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package.read"), packageIdValidation, getPackageById);
export default router;
//# sourceMappingURL=package.routes.js.map