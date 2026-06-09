import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { bulkUpsertPackageTierMappings, replacePackageTierMappings, getServicesByPackageAndTier, updatePackageTierService, } from "../controllers/packagetiermap.controllers.js";
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
const packageTierValidation = [
    param("packageId").isMongoId().withMessage("Invalid packageId"),
    param("tierId").isMongoId().withMessage("Invalid tierId"),
    validate,
];
router.post("/bulk", authenticate, body("packageId").isMongoId().withMessage("Invalid packageId"), body("tierId").isMongoId().withMessage("Invalid tierId"), body("services")
    .isArray({ min: 1 })
    .withMessage("services array is required"), body("services.*.serviceId").isMongoId().withMessage("Invalid serviceId"), body("services.*.name").notEmpty().withMessage("Service name is required"), body("services.*.isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"), body("services.*.isRelated")
    .optional()
    .isBoolean()
    .withMessage("isRelated must be boolean"), body("services").custom((services) => {
    for (const s of services) {
        if (s.isRequired && s.isRelated) {
            throw new Error("Service cannot be both required and related");
        }
    }
    return true;
}), validate, bulkUpsertPackageTierMappings);
router.put("/replace", authenticate, body("packageId").isMongoId().withMessage("Invalid packageId"), body("tierId").isMongoId().withMessage("Invalid tierId"), body("services")
    .isArray({ min: 1 })
    .withMessage("services array is required"), body("services.*.serviceId").isMongoId().withMessage("Invalid serviceId"), body("services.*.name").notEmpty().withMessage("Service name is required"), body("services.*.isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"), body("services.*.isRelated")
    .optional()
    .isBoolean()
    .withMessage("isRelated must be boolean"), body("services").custom((services) => {
    for (const s of services) {
        if (s.isRequired && s.isRelated) {
            throw new Error("Service cannot be both required and related");
        }
    }
    return true;
}), validate, replacePackageTierMappings);
router.get("/:packageId/:tierId", authenticate, packageTierValidation, getServicesByPackageAndTier);
router.patch("/", authenticate, body("packageId").isMongoId().withMessage("Invalid packageId"), body("tierId").isMongoId().withMessage("Invalid tierId"), body("serviceId").isMongoId().withMessage("Invalid serviceId"), body("isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"), body("isRelated")
    .optional()
    .isBoolean()
    .withMessage("isRelated must be boolean"), body().custom((body) => {
    if (body.isRequired && body.isRelated) {
        throw new Error("Service cannot be both required and related");
    }
    return true;
}), validate, updatePackageTierService);
export default router;
//# sourceMappingURL=packagetiermap.routes.js.map