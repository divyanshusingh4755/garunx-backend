import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Role } from '../types/rbac.js';
import { login, register, resendOtp, verifyOtp, refreshToken, logout, forgotPassword, resetPassword, GetUserByEmailorPhone, GetUserById, getGetAllUser, deactivateUser } from '../controllers/auth.controllers.js';
import { passwordRateLimiter } from '../utils/passwordRateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';

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

    body().custom((value, { req }) => {
        if (!req.body.idToken && !req.body.password) {
            throw new Error('Either Social Token or Password is required');
        }
        return true;
    }),

    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
        next();
    }
];

router.post('/register', registerValidation, register)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.post('/logout', logout)
router.post('/forgot-password', passwordRateLimiter, forgotPassword)
router.post('/reset-password/:token', passwordRateLimiter, resetPassword)
router.get('/get-user-by-email-or-phone/:identifier', authenticate, GetUserByEmailorPhone);
router.get('/get-user-by-id/:id', authenticate, GetUserById);
router.delete('/deactivate-user/:id', authenticate, deactivateUser);
router.get('/get-all-user', authenticate, getGetAllUser);


export default router;