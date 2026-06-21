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
router.post("/bulk", authenticate, body("packageId").isMongoId().withMessage("Invalid packageId"), body("tierId").isMongoId().withMessage("Invalid tierId"), body("pricing").optional().isArray().withMessage("pricing array is required"), body("pricing.*.locationId").isMongoId().withMessage("Invalid locationId"), body("pricing.*.services")
    .isArray({ min: 1 })
    .withMessage("services array is required"), body("pricing.*.services.*.serviceId")
    .isMongoId()
    .withMessage("Invalid serviceId"), body("pricing.*.services.*.fixedPrice")
    .optional()
    .isNumeric()
    .withMessage("fixedPrice must be numeric"), body("pricing.*.services.*.discountPercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("discountPercent must be between 0 and 100"), validate, bulkUpsertPackageTierPricing);
router.get("/resolve", authenticate, query("packageId").isMongoId().withMessage("Invalid packageId"), query("tierId").isMongoId().withMessage("Invalid tierId"), query("locationId").isMongoId().withMessage("Invalid locationId"), validate, resolvePackagePricing);
export default router;
//# sourceMappingURL=packagetierpricing.routes.js.map