import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { completeProfile, deleteProfile, getGetAllProfile, getProfileByEmailorPhone, getProfileById, uploadMutliple, uploadSingle } from '../controllers/profile.controllers.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload } from '../middleware/upload.js';
const router = Router()

// Validation Middleware
const profileValidation = [
    body('userId')
        .notEmpty().withMessage('User Id is required')
        .isMongoId().withMessage('Invalid User ID format'),

    body('fullName')
        .notEmpty().withMessage('Full name is required')
        .isString().trim().isLength({ min: 2 }),

    body('email')
        .optional()
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('phoneNumber')
        .optional()
        .isMobilePhone('en-IN')
        .withMessage('Enter valid Indian Phone Number'),

    body('dob')
        .optional()
        .isISO8601()
        .withMessage('DOB must be a valid date (YYYY-MM-DD)'),

    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Other'])
        .withMessage('Invalid gender value'),

    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
        next();
    }
];

router.patch('/complete-profile', profileValidation, authenticate, completeProfile)
router.get('/get-profile-by-id/:id', authenticate, getProfileById)
router.get('/get-profile-by-email-or-phone/:identifier', getProfileByEmailorPhone)
router.get('/get-all-profile', getGetAllProfile);
router.delete('/delete-profile/:id', authenticate, deleteProfile)
router.post('/upload-single', authenticate, upload.single('image'), uploadSingle)
router.post('/upload-multiple', authenticate, upload.array('images', 5), uploadMutliple)

export default router;