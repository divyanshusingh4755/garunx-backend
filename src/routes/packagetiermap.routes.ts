import { Router, } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { bulkUpsertPackageTierMappings, replacePackageTierMappings, getServicesByPackageAndTier, updatePackageTierService, } from "../controllers/packagetiermap.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";

const router = Router();

const packageTierValidation = [
  param("packageId").isMongoId().withMessage("Invalid packageId"),
  param("tierId").isMongoId().withMessage("Invalid tierId"),
  validate,
];

const mappingBodyValidation = [
  body("packageId").notEmpty().withMessage("packageId is required").isMongoId().withMessage("Invalid packageId"),
  body("tierId").notEmpty().withMessage("tierId is required").isMongoId().withMessage("Invalid tierId"),
  body("services").exists({ checkNull: true }).withMessage("services is required").isArray().withMessage("services must be an array"),
  body("services.*.serviceId").notEmpty().withMessage("serviceId is required").isMongoId().withMessage("Invalid serviceId"),
  body("services.*.isRequired").optional().isBoolean().withMessage("isRequired must be boolean").toBoolean(),
  body("services.*.isRelated").optional().isBoolean().withMessage("isRelated must be boolean").toBoolean(),
  body("services").custom((services) => {
    if (!Array.isArray(services)) { return true; }

    for (const service of services) {
      if (service.isRequired === true && service.isRelated === true) {
        throw new Error("Service cannot be both required and related");
      }
    }

    return true;
  }),

  validate,
];

const singleBodyValdation = [
  body("packageId").notEmpty().withMessage("packageId is required").isMongoId().withMessage("Invalid packageId"),
  body("tierId").notEmpty().withMessage("tierId is required").isMongoId().withMessage("Invalid tierId"),
  body("serviceId").notEmpty().withMessage("serviceId is required").isMongoId().withMessage("Invalid serviceId"),
  body("isRequired").optional().isBoolean().withMessage("isRequired must be boolean").toBoolean(),
  body("isRelated").optional().isBoolean().withMessage("isRelated must be boolean").toBoolean(),
  body().custom((payload) => {
    const allowedFields = ["packageId", "tierId", "serviceId", "isRequired", "isRelated",];
    const suppliedFields = Object.keys(payload ?? {});
    const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
    }

    const hasIsRequired = typeof payload.isRequired === "boolean";
    const hasIsRelated = typeof payload.isRelated === "boolean";
    if (!hasIsRequired && !hasIsRelated) {
      throw new Error("isRequired or isRelated is required");
    }

    if (payload.isRequired === true && payload.isRelated === true) {
      throw new Error("Service cannot be both required and related");
    }

    return true;
  }),

  validate,
]

// ADMIN - STATIC BULK / REPLACE OPERATIONS
router.post("/bulk", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package_tier_map.upsert"), mappingBodyValidation, bulkUpsertPackageTierMappings);
router.put("/replace", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package_tier_map.replace"), mappingBodyValidation, replacePackageTierMappings);

// ADMIN - UPDATE SINGLE PACKAGE/TIER SERVICE MAPPING
router.patch("/", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package_tier_map.update"), singleBodyValdation, updatePackageTierService);


// ADMIN - DYNAMIC PACKAGE/TIER LOOKUP
// Keep dynamic route last.
router.get("/:packageId/:tierId", authenticate, authorizeRoles(Role.ADMIN), requirePermission("package_tier_map.read"), packageTierValidation, getServicesByPackageAndTier);

export default router;