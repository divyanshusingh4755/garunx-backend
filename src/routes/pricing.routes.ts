import { Router, type Request, type Response, type NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/authenticate.js";
import { addOrUpdatePricing, getPriceDetails, getPricesByLocation, getAllSerivces } from "../controllers/pricing.controller.js";

const router = Router()

const pricingValidation = [
    body("serviceId").isMongoId().withMessage('Invalid service ID'),
    body("locationIds").isArray({ min: 1 }).withMessage('Invalid Location ID'),
    body("price").isNumeric().withMessage("Price must be a number"),
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
]

// Admin sets the price for a ritual in a city
router.get('/get-all-services-with-price', getAllSerivces);
router.post('/set-price', authenticate, pricingValidation, addOrUpdatePricing);
router.post('/location', getPricesByLocation);
router.get('/details', getPriceDetails)

export default router;