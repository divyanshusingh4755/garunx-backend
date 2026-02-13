import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Role } from '../types/rbac.js';
import { login, register, resendOtp, verifyOtp, refreshToken, logout, forgotPassword, resetPassword, GetUserById, getGetAllUser, deactivateUser, completeProfile, updateProfile, uploadSingle, uploadMutliple, getUserByEmailOrPhone, verifyDocuments, approveOrRejectDocs, changePassword } from '../controllers/auth.controllers.js';
import { passwordRateLimiter } from '../utils/passwordRateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload } from '../middleware/upload.js';

const router = Router()

// Validation Middleware
const registerValidation = [
    body('email')
        .optional()
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('phoneNumber')
        .optional()
        .isMobilePhone('en-IN')
        .withMessage('Enter valid Indian Phone Number'),

    body('role')
        .isIn(Object.values(Role))
        .withMessage('Invalid user type'),

    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

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

// Validation Middleware
const profileValidation = [
    body('userId')
        .notEmpty().withMessage('User Id is required')
        .isMongoId().withMessage('Invalid User ID format'),

    body('fullName')
        .notEmpty().withMessage('Full name is required')
        .isString().trim().isLength({ min: 2 }),

    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('dob')
        .optional()
        .isISO8601()
        .withMessage('DOB must be a valid date (YYYY-MM-DD)'),

    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Other'])
        .withMessage('Invalid gender value'),

    body('referralCode')
        .optional()
        .isString().trim().toUpperCase(),

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

// --- PUBLIC ROUTES (Registration & Auth) ---
router.post('/register', registerValidation, register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// --- PASSWORD RECOVERY ---
router.post('/forgot-password', passwordRateLimiter, forgotPassword);
router.post('/reset-password', passwordRateLimiter, resetPassword);

// --- PROFILE COMPLETION ---
router.patch('/complete-profile', profileValidation, completeProfile);

// --- PROTECTED ROUTES ---
router.post('/change-password', authenticate, changePassword);
router.patch('/update-profile', authenticate, updateProfile);
router.get('/get-user-by-id/:id', authenticate, GetUserById);
router.get('/get-user-by-email-or-phone/:identifier', authenticate, getUserByEmailOrPhone);

// --- ADMIN / MANAGEMENT ROUTES ---
router.get('/get-all-user', authenticate, getGetAllUser);
router.delete('/deactivate-user/:id', authenticate, deactivateUser);
router.patch('/verify-documents', authenticate, approveOrRejectDocs)

// --- MEDIA UPLOADS ---
router.post('/upload-single', upload.single('image'), uploadSingle);
router.post('/upload-multiple', upload.array('images', 5), uploadMutliple);
router.patch('/upload-documents', authenticate, verifyDocuments)
export default router;