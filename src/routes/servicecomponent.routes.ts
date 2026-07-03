import { Router } from "express";
import {
  bulkUpsertServiceComponents,
  replaceServiceComponents,
  getComponentsByServiceAndTier,
  updateServiceComponent,
} from "../controllers/servicecomponent.controllers.js";

import { authenticate } from "../middleware/authenticate.js";
import { param, body, validationResult } from "express-validator";

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

const serviceTierValidation = [
  param("serviceId").isMongoId().withMessage("Invalid serviceId"),
  param("tierId").isMongoId().withMessage("Invalid tierId"),
  validate,
];

router.post(
  "/bulk",
  authenticate,
  body("serviceId").isMongoId(),
  body("tierId").isMongoId(),
  body("components").optional().isArray({ min: 1 }),
  validate,
  bulkUpsertServiceComponents,
);

router.put(
  "/replace",
  authenticate,
  body("serviceId").isMongoId(),
  body("tierId").isMongoId(),
  body("components").optional().isArray({ min: 1 }),
  validate,
  replaceServiceComponents,
);

router.get(
  "/:serviceId/:tierId",
  authenticate,
  serviceTierValidation,
  getComponentsByServiceAndTier,
);

router.patch(
  "/",
  authenticate,
  body("serviceId").isMongoId(),
  body("tierId").isMongoId(),
  body("componentId").isMongoId(),
  validate,
  updateServiceComponent,
);

export default router;
