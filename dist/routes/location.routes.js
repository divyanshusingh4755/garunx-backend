import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/authenticate.js';
import { createLocation, deleteLocation, getAllLocation, getLocationById, updateLocation } from '../controllers/location.controllers.js';
const router = Router();
// Validation Middleware
const locationValidation = [
    body('country').notEmpty().trim(),
    body('state').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('fullAddress').isLength({ min: 10 }).withMessage("Address is too short"),
    body('pincode').isPostalCode('IN').withMessage("Invalid Indian Pincode"),
    body('image').optional().isURL().withMessage("Image must be a valid URL"),
    body('description').optional().isString().trim(),
    body('location.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        next();
    }
];
router.post('/create-location', authenticate, locationValidation, createLocation);
router.patch('/update-location/:id', authenticate, locationValidation, updateLocation);
router.get('/get-all-location', getAllLocation);
router.get('/:id', authenticate, getLocationById);
router.delete('/:id', authenticate, deleteLocation);
export default router;
//# sourceMappingURL=location.routes.js.map