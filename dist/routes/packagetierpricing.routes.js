import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { bulkUpsertPackageTierPricing, resolvePackagePricing, } from "../controllers/packagetierpricing.controllers.js";
const router = Router();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0]?.msg,
        });
    }
    next();
};
router.post("/bulk", authenticate, body("packageId")
    .notEmpty()
    .withMessage("packageId is required")
    .isMongoId()
    .withMessage("Invalid packageId"), body("tierId")
    .notEmpty()
    .withMessage("tierId is required")
    .isMongoId()
    .withMessage("Invalid tierId"), body("pricing")
    .isArray({ min: 1 })
    .withMessage("pricing must contain at least one location"), body("pricing.*.locationId")
    .notEmpty()
    .withMessage("locationId is required")
    .isMongoId()
    .withMessage("Invalid locationId"), body("pricing.*.services")
    .isArray({ min: 1 })
    .withMessage("Each location must contain at least one service"), body("pricing.*.services.*.serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid serviceId"), body("pricing.*.services.*.fixedPrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("fixedPrice must be a non-negative number")
    .toFloat(), body("pricing.*.services.*.discountPercent")
    .optional({ nullable: true })
    .isFloat({
    min: 0,
    max: 100,
})
    .withMessage("discountPercent must be between 0 and 100")
    .toFloat(), body("pricing.*.services.*.taxProfileId")
    .notEmpty()
    .withMessage("taxProfileId is required")
    .isMongoId()
    .withMessage("Invalid taxProfileId"), body("pricing.*.services.*.taxPriceMode")
    .notEmpty()
    .withMessage("taxPriceMode is required")
    .isIn(["EXCLUSIVE", "INCLUSIVE"])
    .withMessage("taxPriceMode must be EXCLUSIVE or INCLUSIVE"), body("pricing.*.services.*")
    .custom((servicePricing) => {
    const hasFixedPrice = servicePricing.fixedPrice !== undefined &&
        servicePricing.fixedPrice !== null;
    const hasDiscountPercent = servicePricing.discountPercent !== undefined &&
        servicePricing.discountPercent !== null;
    if (hasFixedPrice &&
        hasDiscountPercent) {
        throw new Error("fixedPrice and discountPercent cannot be provided together");
    }
    if (!hasFixedPrice &&
        !hasDiscountPercent) {
        throw new Error("Either fixedPrice or discountPercent is required");
    }
    return true;
}), validate, bulkUpsertPackageTierPricing);
router.get("/resolve", authenticate, query("packageId").isMongoId().withMessage("Invalid packageId"), query("tierId").isMongoId().withMessage("Invalid tierId"), query("locationId").isMongoId().withMessage("Invalid locationId"), validate, resolvePackagePricing);
export default router;
//# sourceMappingURL=packagetierpricing.routes.js.map