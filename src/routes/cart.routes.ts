import { type Request, type Response, type NextFunction, Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { CartController } from "../controllers/cart.controllers.js";

const cartController = new CartController();

const cartItemValidation = [
    body('targetId')
        .notEmpty().withMessage('targetId is required')
        .isString().trim(),

    body('itemType')
        .notEmpty().withMessage('itemType is required')
        .isIn(['SERVICE', 'PACKAGE']).withMessage("itemType must be 'SERVICE' or 'PACKAGE'"),

    body('selectedVariantIds')
        .isArray().withMessage('selectedVariantIds must be an array of strings')
        .optional(),

    (req: Request, res: Response, next: NextFunction) => {
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
    }
];

const mergeValidation = [
    // Change to 'guestItems' and ensure it exists
    body('guestItems')
        .exists().withMessage('guestItems is required')
        .isArray().withMessage('guestItems must be an array'),

    body('guestItems.*.targetId')
        .notEmpty().withMessage('Each guest item needs a targetId'),

    (req: Request, res: Response, next: NextFunction) => {
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
    }
];

const router = Router();

router.post('/details', optionalAuthenticate, cartController.getCartDetails);

router.post('/sync', authenticate, cartController.syncCart);
router.post('/merge', authenticate, mergeValidation, cartController.megreCartOnLogin);

router.post('/item', authenticate, cartItemValidation, cartController.addItem);
router.delete('/item/:targetId', authenticate, cartController.removeItem);
router.delete('/item/:targetId/variant/:variantId', authenticate, cartController.removeVariant);

router.delete('/', authenticate, cartController.clearCart);

export default router;