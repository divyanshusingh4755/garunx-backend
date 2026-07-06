import { Router } from 'express';
import { body } from 'express-validator';
import { Role } from '../types/rbac.js';
import { login, register, resendOtp, verifyOtp, refreshToken, logout, forgotPassword, resetPassword, getUserById, getAllUsers, deactivateUser, completeProfile, updateProfile, uploadSingle, uploadMutliple, getUserByEmailOrPhone, verifyDocuments, approveOrRejectDocs, changePassword, socialAuth } from '../controllers/auth.controllers.js';
import { authRateLimiter, otpRateLimiter, passwordResetRateLimiter } from '../utils/rateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload } from '../middleware/upload.js';
import { Caste, Gender, Gotra } from '../types/enums.js';
import { validate } from '../utils/validate.js';

const router = Router()

// Validation Middleware
const registerValidation = [
    body('userEmail')
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

    body("password")
        .optional()
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 0,
        })
        .withMessage(
            "Password must be at least 8 characters long and include uppercase, lowercase, and a number."
        ),

    body().custom(({ email, phoneNumber }) => {
        if (!email && !phoneNumber) {
            throw new Error("Email or phone number is required");
        }
        return true;
    }),

    validate
];

const socialRegisterValidation = [
    body('email')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),

    body('role')
        .exists().withMessage('Role is required')
        .isIn(Object.values(Role))
        .withMessage('Invalid user type'),

    body('idToken')
        .notEmpty()
        .withMessage('Token is missing'),

    validate
];

// Validation Middleware
const profileValidation = [
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

    body("password")
        .optional()
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 0,
        })
        .withMessage(
            "Password must be at least 8 characters long and include uppercase, lowercase, and a number."
        ),

    body('dob')
        .optional()
        .isISO8601()
        .withMessage('DOB must be a valid date (YYYY-MM-DD)'),

    body("gender")
        .optional()
        .isIn(Object.values(Gender)),

    body("caste")
        .optional()
        .isIn(Object.values(Caste)),

    body("gotra")
        .optional()
        .isIn(Object.values(Gotra)),

    body('referralCode')
        .optional()
        .isString().trim().toUpperCase(),

    validate
];


const documentUploadValidation = [
    body().custom((value, { req }) => {
        if (!req.body.aadharCard && !req.body.panCard && !req.body.bankPassbook) {
            throw new Error('At least one document (Aadhar, PAN, or Bank Passbook) must be provided');
        }
        return true;
    }),

    body('bankPassbook').optional().isString().withMessage('Invalid passbook image format'),

    body('accountNumber')
        .if(body('bankPassbook').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Account number is required when uploading bank passbook')
        .isNumeric().withMessage('Account number must contain only digits'),

    body('accountName')
        .if(body('bankPassbook').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Account holder name is required when uploading bank passbook')
        .trim(),

    body('bankName')
        .if(body('bankPassbook').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Bank name is required when uploading bank passbook')
        .trim(),

    body('ifscCode')
        .if(body('bankPassbook').exists({ checkFalsy: true }))
        .notEmpty().withMessage('IFSC code is required when uploading bank passbook')
        .toUpperCase()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .withMessage('Invalid IFSC code format (e.g., SBIN0012345)'),

    validate
];

export const updateProfileValidation = [
    body("fullName")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Full name must be at least 2 characters"),

    body("email")
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage("Invalid email"),

    body("phoneNumber")
        .optional()
        .isMobilePhone("en-IN")
        .withMessage("Invalid phone number"),

    body("dob")
        .optional()
        .isISO8601()
        .toDate()
        .withMessage("Invalid date of birth"),

    body("gender")
        .optional()
        .isIn(Object.values(Gender)),

    body("caste")
        .optional()
        .isIn(Object.values(Caste)),

    body("gotra")
        .optional()
        .isIn(Object.values(Gotra)),

    validate,
];


// --- PUBLIC ROUTES (Registration & Auth) ---
router.post('/register', registerValidation, register);
router.post('/verify-otp', otpRateLimiter, verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.post('/login', authRateLimiter, login);
router.post('/social', authRateLimiter, socialRegisterValidation, socialAuth)
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// --- PASSWORD RECOVERY ---
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);

// --- PROFILE COMPLETION ---
router.patch('/complete-profile', authenticate, profileValidation, completeProfile);

// --- PROTECTED ROUTES ---
router.post('/change-password', authenticate, changePassword);
router.patch('/update-profile', authenticate, updateProfileValidation, updateProfile);
router.get('/get-user-by-id/:id', authenticate, getUserById);
router.get('/get-user-by-email-or-phone/:identifier', authenticate, getUserByEmailOrPhone);

// --- ADMIN / MANAGEMENT ROUTES ---
router.get('/get-all-user', authenticate, getAllUsers);
router.patch('/deactivate-user/:id', authenticate, deactivateUser);
router.patch('/verify-documents', authenticate, approveOrRejectDocs)

// --- MEDIA UPLOADS ---
router.post('/upload-single', upload.single('image'), uploadSingle);
router.post('/upload-multiple', upload.array('images', 5), uploadMutliple);
router.patch('/upload-documents', authenticate, documentUploadValidation, verifyDocuments)
export default router;