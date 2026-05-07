import { Router } from "express";
import {
  bulkUpsertTierPricing,
  resolvePricing,
} from "../controllers/servicepricing.controllers.js";

import { authenticate } from "../middleware/authenticate.js";
import { body, query, validationResult } from "express-validator";

const router = Router();

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg,
    });
  }
  next();
};

router.post(
  "/bulk",
  authenticate,
  body("serviceId").isMongoId(),
  body("tierId").isMongoId(),
  body("pricing").isArray({ min: 1 }),

  validate,
  bulkUpsertTierPricing,
);

router.get(
  "/resolve",
  authenticate,
  query("serviceId").isMongoId(),
  query("tierId").isMongoId(),
  query("locationId").isMongoId(),

  validate,
  resolvePricing,
);

export default router;
