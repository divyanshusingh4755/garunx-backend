import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { body, validationResult } from 'express-validator';
import { createService, deleteService, getServiceById, getServices, updateService } from '../controllers/service.controllers.js';

const router = Router()

const serviceValidation = [
    body('name').notEmpty().withMessage("Service name is required").trim(),
    body('description').notEmpty().withMessage("Description is required").trim(),
    body('category').notEmpty().withMessage("Category (e.g. Puja, Astrology) is required").trim(),
    body('image').optional().isURL().withMessage("Image must be a valid URL"),
    body('isActive').optional().isBoolean(),
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

router.post('/create-service', authenticate, serviceValidation, createService);
router.patch('/update-service/:id', authenticate, serviceValidation, updateService);
router.get('/get-all-services', getServices);
router.get('/:id', getServiceById);
router.delete('/:id', authenticate, deleteService);

export default router;