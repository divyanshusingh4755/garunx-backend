import { Router } from "express";

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

/*
 * Static create and merge routes.
 */
router.post(
  "/service",
  optionalAuthenticate,
  createServiceCart,
);

router.post(
  "/package",
  optionalAuthenticate,
  createPackageCart,
);

router.post(
  "/merge",
  authenticate,
  mergeGuestCartToUser,
);

/*
 * Cart listing and details.
 */
router.get(
  "/",
  optionalAuthenticate,
  getUserCarts,
);

router.get(
  "/:cartId",
  optionalAuthenticate,
  getCartById,
);

/*
 * Cart selections.
 */
router.put(
  "/:cartId/components",
  optionalAuthenticate,
  updateSelectedComponents,
);

router.put(
  "/:cartId/addon-components",
  optionalAuthenticate,
  updateAddonComponents,
);

router.put(
  "/:cartId/selected-services",
  optionalAuthenticate,
  updateSelectedServices,
);

router.put(
  "/:cartId/addon-services",
  optionalAuthenticate,
  updateAddonServices,
);

/*
 * Cart details.
 */
router.put(
  "/:cartId/schedule",
  optionalAuthenticate,
  updateSchedule,
);

router.put(
  "/:cartId/customer-details",
  optionalAuthenticate,
  updateCustomerDetails,
);

router.put(
  "/:cartId/notes",
  optionalAuthenticate,
  updateCartNotes,
);

/*
 * Pricing, validation and checkout.
 */
router.post(
  "/:cartId/recalculate",
  optionalAuthenticate,
  recalculateCart,
);

router.post(
  "/:cartId/validate",
  optionalAuthenticate,
  validateCart,
);

router.post(
  "/:cartId/checkout",
  authenticate,
  checkoutCart,
);

router.post(
  "/:cartId/reopen",
  optionalAuthenticate,
  reopenCart,
);

/*
 * Coupons.
 */
router.post(
  "/:cartId/apply-coupon",
  optionalAuthenticate,
  applyCoupon,
);

router.delete(
  "/:cartId/remove-coupon",
  optionalAuthenticate,
  removeCoupon,
);

/*
 * Cart deletion.
 */
router.delete(
  "/:cartId",
  optionalAuthenticate,
  deleteCart,
);

export default router;