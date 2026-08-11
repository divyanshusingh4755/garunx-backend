import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, param, query, validationResult } from "express-validator";

import {
  createServiceCart,
  createPackageCart,
  getUserCarts,
  getCartById,
  updateSelectedComponents,
  updateAddonComponents,
  updateAddonServices,
  updateSchedule,
  updateCustomerDetails,
  updateCartNotes,
  recalculateCart,
  validateCart,
  checkoutCart,
  deleteCart,
  updateSelectedServices,
  mergeGuestCartToUser,
  applyCoupon,
  removeCoupon,
  reopenCart,
} from "../controllers/cart.controllers.js";

import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/authenticate.js";

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

const cartIdValidation = [
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  validate,
];

const ownerSelectionValidation = [
  body("tierId")
    .notEmpty()
    .withMessage("tierId is required")
    .isMongoId()
    .withMessage("Invalid tierId"),

  body("locationId")
    .notEmpty()
    .withMessage("locationId is required")
    .isMongoId()
    .withMessage("Invalid locationId"),
];

router.post(
  "/service",
  optionalAuthenticate,
  body("serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid serviceId"),
  ...ownerSelectionValidation,
  validate,
  createServiceCart,
);

router.post(
  "/package",
  optionalAuthenticate,
  body("packageId")
    .notEmpty()
    .withMessage("packageId is required")
    .isMongoId()
    .withMessage("Invalid packageId"),
  ...ownerSelectionValidation,
  validate,
  createPackageCart,
);

router.post("/merge", authenticate, mergeGuestCartToUser);

router.get(
  "/",
  optionalAuthenticate,
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  validate,
  getUserCarts,
);

router.get("/:cartId", optionalAuthenticate, cartIdValidation, getCartById);

router.put(
  "/:cartId/components",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("selectedComponents")
    .isArray()
    .withMessage("selectedComponents must be an array"),
  validate,
  updateSelectedComponents,
);

router.put(
  "/:cartId/addon-components",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("addonComponents")
    .isArray()
    .withMessage("addonComponents must be an array"),
  validate,
  updateAddonComponents,
);

const serviceSelectionValidation = [
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("serviceIds").isArray().withMessage("serviceIds must be an array"),
  body("serviceIds.*").isMongoId().withMessage("Invalid serviceId"),
  validate,
];

router.put(
  "/:cartId/selected-services",
  optionalAuthenticate,
  serviceSelectionValidation,
  updateSelectedServices,
);

router.put(
  "/:cartId/addon-services",
  optionalAuthenticate,
  serviceSelectionValidation,
  updateAddonServices,
);

router.put(
  "/:cartId/schedule",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("scheduledDate")
    .notEmpty()
    .withMessage("scheduledDate is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("scheduledDate must use YYYY-MM-DD format"),
  body("scheduledTime")
    .notEmpty()
    .withMessage("scheduledTime is required")
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage("scheduledTime must use HH:mm format"),
  validate,
  updateSchedule,
);

router.put(
  "/:cartId/customer-details",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("bookingFor")
    .optional()
    .isIn(["MYSELF", "OTHER"])
    .withMessage("Invalid bookingFor value"),
  body("name").notEmpty().withMessage("name is required"),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("phone").notEmpty().withMessage("phone is required").isString(),
  validate,
  updateCustomerDetails,
);

router.put(
  "/:cartId/notes",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),
  validate,
  updateCartNotes,
);

router.post(
  "/:cartId/recalculate",
  optionalAuthenticate,
  cartIdValidation,
  recalculateCart,
);

router.post(
  "/:cartId/validate",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("persist")
    .optional()
    .isBoolean()
    .withMessage("persist must be boolean")
    .toBoolean(),
  validate,
  validateCart,
);

router.post("/:cartId/checkout", authenticate, cartIdValidation, checkoutCart);

router.post(
  "/:cartId/reopen",
  optionalAuthenticate,
  cartIdValidation,
  reopenCart,
);

router.post(
  "/:cartId/apply-coupon",
  optionalAuthenticate,
  param("cartId").isMongoId().withMessage("Invalid cartId"),
  body("couponCode")
    .notEmpty()
    .withMessage("couponCode is required")
    .isString()
    .trim(),
  validate,
  applyCoupon,
);

router.delete(
  "/:cartId/remove-coupon",
  optionalAuthenticate,
  cartIdValidation,
  removeCoupon,
);

router.delete("/:cartId", optionalAuthenticate, cartIdValidation, deleteCart);

export default router;
