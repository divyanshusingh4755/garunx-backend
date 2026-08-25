import { Router } from "express";
import { body, query } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { bulkUpsertPackageTierPricing, resolvePackagePricing } from "../controllers/packagetierpricing.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";

const bulkUpdateValidation = [
  body("packageId").notEmpty().withMessage("packageId is required").isMongoId().withMessage("Invalid packageId"),
  body("tierId").notEmpty().withMessage("tierId is required").isMongoId().withMessage("Invalid tierId"),
  body("pricing").isArray({ min: 1 }).withMessage("pricing must contain at least one location"),
  body("pricing.*.locationId").notEmpty().withMessage("locationId is required").isMongoId().withMessage("Invalid locationId"),
  body("pricing.*.services").isArray({ min: 1 }).withMessage("Each location must contain at least one service"),
  body("pricing.*.services.*.serviceId").notEmpty().withMessage("serviceId is required").isMongoId().withMessage("Invalid serviceId"),
  body("pricing.*.services.*.fixedPrice").optional({ nullable: true }).isFloat({ min: 0 }).withMessage("fixedPrice must be a non-negative number").toFloat(),
  body("pricing.*.services.*.discountPercent").optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage("discountPercent must be between 0 and 100").toFloat(),
  body("pricing.*.services.*.taxProfileId").notEmpty().withMessage("taxProfileId is required").isMongoId().withMessage("Invalid taxProfileId"),
  body("pricing.*.services.*.taxPriceMode").optional().isIn(["EXCLUSIVE", "INCLUSIVE",]).withMessage("taxPriceMode must be EXCLUSIVE or INCLUSIVE"),
  body("pricing.*.services.*").custom((servicePricing) => {
    const hasFixedPrice = servicePricing.fixedPrice !== undefined && servicePricing.fixedPrice !== null;
    const hasDiscountPercent = servicePricing.discountPercent !== undefined && servicePricing.discountPercent !== null;

    if (hasFixedPrice && hasDiscountPercent) {
      throw new Error("fixedPrice and discountPercent cannot be provided together");
    }

    if (!hasFixedPrice && !hasDiscountPercent) {
      throw new Error("Either fixedPrice or discountPercent is required");
    }
    return true;
  },
  ),

  validate,
]

const bulkReplaceValidation = [
  query("packageId").notEmpty().withMessage("packageId is required").isMongoId().withMessage("Invalid packageId"),
  query("tierId").notEmpty().withMessage("tierId is required").isMongoId().withMessage("Invalid tierId"),
  query("locationId").notEmpty().withMessage("locationId is required").isMongoId().withMessage("Invalid locationId"),
  validate,
]

const router = Router();

// ADMIN - BULK PRICING UPDATE
router.post("/bulk", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package_tier_pricing.update"), bulkUpdateValidation, bulkUpsertPackageTierPricing);

// USER - RESOLVE PACKAGE PRICING
router.get("/resolve", authenticate, authorizeRoles(Role.USER), bulkReplaceValidation, resolvePackagePricing);

export default router;