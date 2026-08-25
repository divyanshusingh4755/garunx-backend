import { Router } from "express";
import { body, param, query } from "express-validator";
import { TaxProfileController } from "../controllers/taxprofile.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";
const router = Router();
const TAX_TREATMENTS = ["TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST"];
const taxProfileIdValidation = [param("taxProfileId").isMongoId().withMessage("Invalid taxProfileId"),
    validate,
];
const createTaxProfileValidation = [
    body("name").exists({ values: "falsy" }).withMessage("Tax profile name is required").bail().isString().withMessage("Tax profile name must be a string").bail().trim().isLength({ min: 2, max: 100 }).withMessage("Tax profile name must be between 2 and 100 characters"),
    body("code").exists({ values: "falsy" }).withMessage("Tax profile code is required").bail().isString().withMessage("Tax profile code must be a string").bail().trim().toUpperCase().isLength({ min: 2, max: 50 }).withMessage("Tax profile code must be between 2 and 50 characters").matches(/^[A-Z0-9_]+$/).withMessage("Tax profile code may contain only uppercase letters, numbers and underscores"),
    body("treatment").exists({ values: "falsy" }).withMessage("Tax treatment is required").bail().isIn(TAX_TREATMENTS).withMessage("Tax treatment must be TAXABLE, EXEMPT, NIL_RATED or NON_GST"),
    body("totalRate").exists().withMessage("totalRate is required").bail().isFloat({ min: 0, max: 100 }).withMessage("totalRate must be between 0 and 100").toFloat(),
    body("description").optional({ nullable: true, checkFalsy: true }).isString().withMessage("description must be a string").bail().trim().isLength({ max: 500 }).withMessage("description cannot exceed 500 characters"),
    body().custom((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const { treatment, totalRate } = value;
        if (treatment === "TAXABLE" && Number(totalRate) <= 0) {
            throw new Error("Taxable profile must have totalRate greater than zero");
        }
        if (treatment !== "TAXABLE" && Number(totalRate) !== 0) {
            throw new Error("EXEMPT, NIL_RATED and NON_GST profiles must have totalRate equal to zero");
        }
        return true;
    }),
    validate,
];
const updateTaxProfileValidation = [
    body().custom((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const allowedFields = ["name", "treatment", "totalRate", "description",];
        const suppliedFields = Object.keys(value);
        if (suppliedFields.length === 0) {
            throw new Error("At least one editable field is required");
        }
        const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
        }
        return true;
    }),
    body("name").optional().isString().withMessage("Tax profile name must be a string").bail().trim().isLength({ min: 2, max: 100 }).withMessage("Tax profile name must be between 2 and 100 characters"),
    body("treatment").optional().isIn(TAX_TREATMENTS).withMessage("Tax treatment must be TAXABLE, EXEMPT, NIL_RATED or NON_GST"),
    body("totalRate").optional().isFloat({ min: 0, max: 100 }).withMessage("totalRate must be between 0 and 100").toFloat(),
    body("description").optional({ nullable: true }).custom((value) => {
        if (value === null || value === "") {
            return true;
        }
        if (typeof value !== "string") {
            throw new Error("description must be a string or null");
        }
        if (value.trim().length > 500) {
            throw new Error("description cannot exceed 500 characters");
        }
        return true;
    }),
    body().custom((value) => {
        const { treatment, totalRate } = value;
        if (treatment === "TAXABLE" && totalRate !== undefined && Number(totalRate) <= 0) {
            throw new Error("Taxable profile must have totalRate greater than zero");
        }
        if (treatment && treatment !== "TAXABLE" && totalRate !== undefined && Number(totalRate) !== 0) {
            throw new Error("Non-taxable treatments must have totalRate equal to zero");
        }
        return true;
    }),
    validate,
];
const updateTaxProfileStatusValidation = [
    body("isActive").exists().withMessage("isActive is required").bail().isBoolean({ strict: true }).withMessage("isActive must be a boolean").toBoolean(),
    validate,
];
const listTaxProfilesValidation = [
    query("search").optional().isString().withMessage("search must be a string").bail().trim().isLength({ max: 100 }).withMessage("search cannot exceed 100 characters"),
    query("treatment").optional().isIn(TAX_TREATMENTS).withMessage("Invalid treatment filter"),
    query("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
    validate,
];
const exportTaxProfilesValidation = [
    body("taxProfileIds").isArray({ min: 1, max: 1000 }).withMessage("taxProfileIds must contain between 1 and 1000 tax profile IDs"),
    body("taxProfileIds.*").isMongoId().withMessage("Each taxProfileId must be a valid MongoDB ID"),
    validate,
];
router.use(authenticate, authorizeRoles(Role.ADMIN));
// STATIC ROUTES
router.get("/active", requirePermission("tax_profile.read"), TaxProfileController.listActive);
router.post("/export", requirePermission("tax_profile.export"), exportTaxProfilesValidation, TaxProfileController.exportCsv);
router.post("/", requirePermission("tax_profile.create"), createTaxProfileValidation, TaxProfileController.create);
router.get("/", requirePermission("tax_profile.read"), listTaxProfilesValidation, TaxProfileController.list);
// SPECIFIC TAX PROFILE ACTIONS
router.patch("/:taxProfileId/status", requirePermission("tax_profile.status"), taxProfileIdValidation, updateTaxProfileStatusValidation, TaxProfileController.updateStatus);
// GENERIC TAX PROFILE ROUTES
router.get("/:taxProfileId", requirePermission("tax_profile.read"), taxProfileIdValidation, TaxProfileController.getById);
router.patch("/:taxProfileId", requirePermission("tax_profile.update"), taxProfileIdValidation, updateTaxProfileValidation, TaxProfileController.update);
export default router;
//# sourceMappingURL=taxprofile.routes.js.map