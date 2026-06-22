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
} from "../controllers/cart.controllers.js";

import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/authenticate.js";

const router = Router();

router.post("/service", optionalAuthenticate, createServiceCart);
router.post("/package", optionalAuthenticate, createPackageCart);
router.get("/", optionalAuthenticate, getUserCarts);
router.get("/:cartId", optionalAuthenticate, getCartById);
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
router.put("/:cartId/schedule", optionalAuthenticate, updateSchedule);
router.put(
  "/:cartId/customer-details",
  optionalAuthenticate,
  updateCustomerDetails,
);
router.put("/:cartId/notes", optionalAuthenticate, updateCartNotes);
router.post("/:cartId/recalculate", optionalAuthenticate, recalculateCart);
router.post("/:cartId/validate", optionalAuthenticate, validateCart);
router.post("/:cartId/checkout", authenticate, checkoutCart);
router.post("/merge", authenticate, mergeGuestCartToUser);
router.post("/:cartId/apply-coupon", optionalAuthenticate, applyCoupon);
router.delete("/:cartId/remove-coupon", optionalAuthenticate, removeCoupon);
router.delete("/:cartId", optionalAuthenticate, deleteCart);

export default router;
