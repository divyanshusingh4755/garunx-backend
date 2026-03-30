import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/authenticate.js';
import { createCity, deleteCity, getAllCity, getCityById, updateCity } from '../controllers/city.controllers.js';

const router = Router()

const cityValidation = [
    body('state').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('image').optional().isURL().withMessage("Image must be a valid URL"),
    body('description').optional().isString().trim(),
    body('location.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]"),
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

router.get('/get-all-city', getAllCity); // Specific first
router.post('/create-city', authenticate, cityValidation, createCity);
router.patch('/update-city/:id', authenticate, cityValidation, updateCity);
router.get('/:id', authenticate, getCityById); // Dynamic last
router.patch('/:id', authenticate, deleteCity);

export default router;