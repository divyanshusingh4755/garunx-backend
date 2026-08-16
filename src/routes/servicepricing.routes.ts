import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  body,
  query,
  validationResult,
  type ValidationChain,
} from "express-validator";

import {
  bulkUpsertTierPricing,
  resolvePricing,
} from "../controllers/servicepricing.controllers.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
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

const bulkPricingValidation: ValidationChain[] = [
  body("serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid serviceId"),

  body("tierId")
    .notEmpty()
    .withMessage("tierId is required")
    .isMongoId()
    .withMessage("Invalid tierId"),

  body("pricing")
    .isArray({ min: 1 })
    .withMessage("pricing must contain at least one location"),

  body("pricing.*.locationId")
    .notEmpty()
    .withMessage("locationId is required")
    .isMongoId()
    .withMessage("Invalid locationId"),

  body("pricing.*.components")
    .isArray({ min: 1 })
    .withMessage("Each location must contain at least one component"),

  body("pricing.*.components.*.componentId")
    .notEmpty()
    .withMessage("componentId is required")
    .isMongoId()
    .withMessage("Invalid componentId"),

  body("pricing.*.components.*.price")
    .exists({ checkNull: true })
    .withMessage("price is required")
    .isFloat({ min: 0 })
    .withMessage("price must be a non-negative number")
    .toFloat(),

  body("pricing.*.components.*.taxProfileId")
    .optional({
      values: "null",
    })
    .isMongoId()
    .withMessage("Invalid taxProfileId"),

  body("pricing.*.components.*.taxPriceMode")
    .optional()
    .isIn(["EXCLUSIVE", "INCLUSIVE"])
    .withMessage("taxPriceMode must be EXCLUSIVE or INCLUSIVE"),
];

// =========================================================
// ADMIN - BULK SERVICE PRICING UPDATE
// =========================================================

router.post(
  "/bulk",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission(
    "service_pricing.update",
  ),
  ...bulkPricingValidation,
  validate,
  bulkUpsertTierPricing,
);


// =========================================================
// USER - RESOLVE SERVICE PRICING
// =========================================================

router.get(
  "/resolve",
  authenticate,
  authorizeRoles(Role.USER),

  query("serviceId")
    .notEmpty()
    .withMessage(
      "serviceId is required",
    )
    .isMongoId()
    .withMessage(
      "Invalid serviceId",
    ),

  query("tierId")
    .notEmpty()
    .withMessage(
      "tierId is required",
    )
    .isMongoId()
    .withMessage(
      "Invalid tierId",
    ),

  query("locationId")
    .notEmpty()
    .withMessage(
      "locationId is required",
    )
    .isMongoId()
    .withMessage(
      "Invalid locationId",
    ),

  validate,
  resolvePricing,
);


export default router;