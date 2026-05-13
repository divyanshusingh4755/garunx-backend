import { Router, } from "express";
import { body, validationResult } from "express-validator";
import { authenticate, optionalAuthenticate, } from "../middleware/authenticate.js";
import { CartController } from "../controllers/cart.controllers.js";
const cartController = new CartController();
const validate = (req, res, next) => {
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
const objectIdValidation = (field) => body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isMongoId()
    .withMessage(`${field} must be valid Mongo ID`);
const optionalObjectIdValidation = (field) => body(field)
    .optional()
    .isMongoId()
    .withMessage(`${field} must be valid Mongo ID`);
const createCartValidation = [
    body("cartType").optional().isIn(["SERVICE", "PACKAGE", "MIXED"]),
    validate,
];
const updateCartValidation = [
    body("scheduledAt")
        .optional()
        .isISO8601()
        .withMessage("scheduledAt muste be valid date"),
    body("notes").optional().isString().isLength({ max: 1000 }),
    body("customerDetails")
        .optional()
        .isObject()
        .withMessage("customerDetails must be object"),
    validate,
];
const addServiceEntryValidation = [
    objectIdValidation("serviceId"),
    objectIdValidation("tierId"),
    objectIdValidation("locationId"),
    optionalObjectIdValidation("subServiceId"),
    validate,
];
const addPackageEntryValidation = [objectIdValidation("packageId"), validate];
const updateComponentValidation = [
    body("selected")
        .optional()
        .isBoolean()
        .withMessage("selected must be boolean"),
];
const updateComponentItemsValidation = [
    body("selectedItems")
        .exists()
        .isArray()
        .withMessage("selectedItems must be arrays"),
    body("selectedItems.*.itemId")
        .exists()
        .isMongoId()
        .withMessage("itemId must be valid mongo id"),
    validate,
];
const addAddonComponentValidation = [
    objectIdValidation("componentId"),
    validate,
];
const addAddonServiceValidation = [
    objectIdValidation("serviceId"),
    objectIdValidation("tierId"),
    objectIdValidation("locationId"),
    optionalObjectIdValidation("subServiceId"),
    validate,
];
const router = Router();
// Cart Routes
router.post("/", authenticate, createCartValidation, cartController.createCart);
router.get("/", authenticate, cartController.getUserCarts);
router.get("/:cartId", authenticate, cartController.getCartById);
router.patch("/:cartId", authenticate, updateCartValidation, cartController.updateCart);
router.delete("/:cartId", authenticate, cartController.deleteCart);
router.delete("/:cartId/entries", authenticate, cartController.clearCartEntries);
// Entry Routes
router.post("/:cartId/entries/service", authenticate, addServiceEntryValidation, cartController.addServiceEntry);
router.post("/:cartId/entries/package", authenticate, addPackageEntryValidation, cartController.addPackageEntry);
router.get("/:cartId/entries/:entryId", authenticate, cartController.getEntryById);
router.patch("/:cartId/entries/:entryId", authenticate, cartController.updateEntry);
router.delete("/:cartId/entries/:entryId", authenticate, cartController.removeEntry);
// Component Routes
router.get("/:cartId/entries/:entryId/components", authenticate, cartController.getEntryComponents);
router.patch("/:cartId/entries/:entryId/components/:componentId", authenticate, updateComponentValidation, cartController.updateComponent);
router.patch("/:cartId/entries/:entryId/components/:componentId/items", authenticate, updateComponentItemsValidation, cartController.updateComponentItems);
router.post("/:cartId/entries/:entryId/components/addon", authenticate, addAddonComponentValidation, cartController.addAddonComponent);
router.delete("/:cartId/entries/:entryId/components/:componentId", authenticate, cartController.removeAddonComponent);
// Package Addon service Routes
router.post("/:cartId/entries/:entryId/addon-services", authenticate, addAddonServiceValidation, cartController.addAddonService);
router.delete("/:cartId/entries/:entryId/addon-services/:serviceId", authenticate, cartController.removeAddonService);
router.patch("/:cartId/entries/:entryId/services/:serviceId", authenticate, cartController.updateIncludedService);
// Validation and Pricing
router.post("/:cartId/validate", authenticate, cartController.validateCart);
router.post("/:cartId/recalculate", authenticate, cartController.recalculateCart);
router.post("/:cartId/prepare-checkout", authenticate, cartController.prepareCheckout);
router.post("/:cartId/checkout", authenticate, cartController.checkoutCart);
export default router;
//# sourceMappingURL=cart.routes.js.map