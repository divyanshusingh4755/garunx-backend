import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import {
  body,
  param,
  query,
  validationResult,
} from "express-validator";

import {
  TaxProfileController,
} from "../controllers/taxprofile.controller.js";

import {
  authenticate,
} from "../middleware/authenticate.js";

import {
  authorizeRoles,
} from "../middleware/authorizeRoles.js";

import { Role } from "../types/rbac.js";

const router = Router();

const TAX_TREATMENTS = [
  "TAXABLE",
  "EXEMPT",
  "NIL_RATED",
  "NON_GST",
] as const;

/**
 * Common express-validator error handler.
 */
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];

    return res.status(400).json({
      success: false,
      message:
        typeof firstError?.msg === "string"
          ? firstError.msg
          : "Validation failed",
      error: firstError,
    });
  }

  next();
};

/**
 * Validate MongoDB ObjectId route parameter.
 */
const taxProfileIdValidation = [
  param("taxProfileId")
    .notEmpty()
    .withMessage("taxProfileId is required")
    .isMongoId()
    .withMessage("Invalid taxProfileId"),

  handleValidationErrors,
];

/**
 * Create tax profile validation.
 */
const createTaxProfileValidation = [
  body("name")
    .exists({ values: "falsy" })
    .withMessage("Tax profile name is required")
    .bail()
    .isString()
    .withMessage("Tax profile name must be a string")
    .bail()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Tax profile name must be between 2 and 100 characters",
    ),

  body("code")
    .exists({ values: "falsy" })
    .withMessage("Tax profile code is required")
    .bail()
    .isString()
    .withMessage("Tax profile code must be a string")
    .bail()
    .trim()
    .toUpperCase()
    .isLength({
      min: 2,
      max: 50,
    })
    .withMessage(
      "Tax profile code must be between 2 and 50 characters",
    )
    .matches(/^[A-Z0-9_]+$/)
    .withMessage(
      "Tax profile code may contain only uppercase letters, numbers and underscores",
    ),

  body("treatment")
    .exists({ values: "falsy" })
    .withMessage("Tax treatment is required")
    .bail()
    .isIn(TAX_TREATMENTS)
    .withMessage(
      "Tax treatment must be TAXABLE, EXEMPT, NIL_RATED or NON_GST",
    ),

  body("totalRate")
    .exists()
    .withMessage("totalRate is required")
    .bail()
    .isFloat({
      min: 0,
      max: 100,
    })
    .withMessage(
      "totalRate must be between 0 and 100",
    )
    .toFloat(),

  body("description")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isString()
    .withMessage("description must be a string")
    .bail()
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage(
      "description cannot exceed 500 characters",
    ),

  /**
   * Cross-field validation.
   */
  body().custom((value) => {
    const {
      treatment,
      totalRate,
    } = value;

    if (
      treatment === "TAXABLE" &&
      Number(totalRate) <= 0
    ) {
      throw new Error(
        "Taxable profile must have totalRate greater than zero",
      );
    }

    if (
      treatment !== "TAXABLE" &&
      Number(totalRate) !== 0
    ) {
      throw new Error(
        "EXEMPT, NIL_RATED and NON_GST profiles must have totalRate equal to zero",
      );
    }

    return true;
  }),

  handleValidationErrors,
];

/**
 * Update validation.
 *
 * Every field is optional, but at least one editable field
 * must be present.
 */
const updateTaxProfileValidation = [
  body().custom((value) => {
    const allowedFields = [
      "name",
      "treatment",
      "totalRate",
      "description",
    ];

    const hasEditableField =
      allowedFields.some(
        (field) =>
          Object.prototype.hasOwnProperty.call(
            value,
            field,
          ),
      );

    if (!hasEditableField) {
      throw new Error(
        "At least one editable field is required",
      );
    }

    return true;
  }),

  body("name")
    .optional()
    .isString()
    .withMessage(
      "Tax profile name must be a string",
    )
    .bail()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Tax profile name must be between 2 and 100 characters",
    ),

  body("treatment")
    .optional()
    .isIn(TAX_TREATMENTS)
    .withMessage(
      "Tax treatment must be TAXABLE, EXEMPT, NIL_RATED or NON_GST",
    ),

  body("totalRate")
    .optional()
    .isFloat({
      min: 0,
      max: 100,
    })
    .withMessage(
      "totalRate must be between 0 and 100",
    )
    .toFloat(),

  body("description")
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (value === null || value === "") {
        return true;
      }

      if (typeof value !== "string") {
        throw new Error(
          "description must be a string or null",
        );
      }

      if (value.trim().length > 500) {
        throw new Error(
          "description cannot exceed 500 characters",
        );
      }

      return true;
    }),

  /**
   * Validate fields that are supplied together.
   *
   * Full treatment/rate consistency should also remain
   * in the service/model because PATCH may omit one field.
   */
  body().custom((value) => {
    const {
      treatment,
      totalRate,
    } = value;

    if (
      treatment === "TAXABLE" &&
      totalRate !== undefined &&
      Number(totalRate) <= 0
    ) {
      throw new Error(
        "Taxable profile must have totalRate greater than zero",
      );
    }

    if (
      treatment &&
      treatment !== "TAXABLE" &&
      totalRate !== undefined &&
      Number(totalRate) !== 0
    ) {
      throw new Error(
        "Non-taxable treatments must have totalRate equal to zero",
      );
    }

    return true;
  }),

  handleValidationErrors,
];

/**
 * Status validation.
 */
const updateTaxProfileStatusValidation = [
  body("isActive")
    .exists()
    .withMessage("isActive is required")
    .bail()
    .isBoolean({
      strict: true,
    })
    .withMessage(
      "isActive must be a boolean",
    )
    .toBoolean(),

  handleValidationErrors,
];

/**
 * Admin list query validation.
 */
const listTaxProfilesValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("search must be a string")
    .bail()
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "search cannot exceed 100 characters",
    ),

  query("treatment")
    .optional()
    .isIn(TAX_TREATMENTS)
    .withMessage(
      "Invalid treatment filter",
    ),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage(
      "isActive must be true or false",
    ),

  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "page must be a positive integer",
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "limit must be between 1 and 100",
    )
    .toInt(),

  handleValidationErrors,
];

/**
 * All routes below require authenticated admin access.
 */
router.use(
  authenticate,
  authorizeRoles(Role.ADMIN),
);

/**
 * Keep static routes before dynamic routes.
 */
router.get(
  "/active",
  TaxProfileController.listActive,
);

router.post(
  "/",
  createTaxProfileValidation,
  TaxProfileController.create,
);

router.get(
  "/",
  listTaxProfilesValidation,
  TaxProfileController.list,
);

router.get(
  "/:taxProfileId",
  taxProfileIdValidation,
  TaxProfileController.getById,
);

router.patch(
  "/:taxProfileId",
  taxProfileIdValidation,
  updateTaxProfileValidation,
  TaxProfileController.update,
);

router.patch(
  "/:taxProfileId/status",
  taxProfileIdValidation,
  updateTaxProfileStatusValidation,
  TaxProfileController.updateStatus,
);

export default router;