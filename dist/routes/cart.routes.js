import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { CartController } from "../controllers/cart.controllers.js";
const cartController = new CartController();
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError
        });
    }
    next();
};
const cartItemValidation = [
    body('targetId').notEmpty().isString().trim(),
    body('itemType').isIn(['SERVICE', 'PACKAGE']),
    body('selectedVariantIds').optional().isArray(),
    body('selectedVariantIds.*').optional().isString(),
    validate
];
const mergeValidation = [
    body('guestItems').exists().isArray(),
    body('guestItems.*.targetId').notEmpty(),
    body('guestItems.*.itemType').isIn(['SERVICE', 'PACKAGE']),
    body('guestItems.*.selectedVariantIds')
        .isArray({ min: 1 }),
    body('guestItems.*.selectedVariantIds.*')
        .isString(),
    validate
];
const router = Router();
router.get('/', authenticate, cartController.getCart);
router.get('/item/:targetId', authenticate, cartController.getCartItemByTargetId);
router.get('/count', authenticate, cartController.getCartCount);
router.post('/details', optionalAuthenticate, cartController.getCartDetails);
router.post('/sync', authenticate, cartController.syncCart);
router.post('/merge', authenticate, mergeValidation, cartController.mergeCartOnLogin);
router.post('/item', authenticate, cartItemValidation, cartController.addItem);
router.put('/item/:itemKey', authenticate, cartItemValidation, cartController.updateItem);
router.delete('/item/:itemKey', authenticate, cartController.removeItem);
router.delete('/item/:itemKey/variant/:variantId', authenticate, cartController.removeVariant);
router.delete('/', authenticate, cartController.clearCart);
router.post('/validate', cartController.validateCart);
router.post('/checkout', authenticate, cartController.prepareCheckout);
export default router;
//# sourceMappingURL=cart.routes.js.map