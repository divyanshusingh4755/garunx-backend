import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, param, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import {
  bulkUpsertPackageTierMappings,
  replacePackageTierMappings,
  getServicesByPackageAndTier,
  updatePackageTierService,
} from "../controllers/packagetiermap.controllers.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];

    return res.status(400).json({
      success: false,
      message: firstError?.msg,
      error: firstError,
    });
  }

  next();
};

const packageTierValidation = [
  param("packageId").isMongoId().withMessage("Invalid packageId"),
  param("tierId").isMongoId().withMessage("Invalid tierId"),
  validate,
];

const mappingBodyValidation = [
  body("packageId")
    .notEmpty()
    .withMessage("packageId is required")
    .isMongoId()
    .withMessage("Invalid packageId"),

  body("tierId")
    .notEmpty()
    .withMessage("tierId is required")
    .isMongoId()
    .withMessage("Invalid tierId"),

  body("services")
    .exists({ checkNull: true })
    .withMessage("services is required")
    .isArray()
    .withMessage("services must be an array"),

  body("services.*.serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid serviceId"),

  body("services.*.isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"),

  body("services.*.isRelated")
    .optional()
    .isBoolean()
    .withMessage("isRelated must be boolean"),

  body("services").custom((services) => {
    if (!Array.isArray(services)) {
      return true;
    }

    for (const service of services) {
      if (service.isRequired === true && service.isRelated === true) {
        throw new Error("Service cannot be both required and related");
      }
    }

    return true;
  }),

  validate,
];

router.post(
  "/bulk",
  authenticate,
  mappingBodyValidation,
  bulkUpsertPackageTierMappings,
);

router.put(
  "/replace",
  authenticate,
  mappingBodyValidation,
  replacePackageTierMappings,
);

router.get(
  "/:packageId/:tierId",
  authenticate,
  packageTierValidation,
  getServicesByPackageAndTier,
);

router.patch(
  "/",
  authenticate,

  body("packageId")
    .notEmpty()
    .withMessage("packageId is required")
    .isMongoId()
    .withMessage("Invalid packageId"),

  body("tierId")
    .notEmpty()
    .withMessage("tierId is required")
    .isMongoId()
    .withMessage("Invalid tierId"),

  body("serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid serviceId"),

  body("isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be boolean"),

  body("isRelated")
    .optional()
    .isBoolean()
    .withMessage("isRelated must be boolean"),

  body().custom((payload) => {
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
  updatePackageTierService,
);

export default router;
