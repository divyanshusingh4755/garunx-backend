import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Role } from '../types/rbac.js';
import { login, register, resendOtp, verifyOtp, refreshToken, logout, forgotPassword, resetPassword, getUserById, getAllUsers, deactivateUser, completeProfile, updateProfile, uploadSingle, uploadMutliple, getUserByEmailOrPhone, submitVerificationDocuments, approveOrRejectDocs, changePassword, socialAuth, updateCoordinatorAvailability, getCurrentUser, updateCoordinatorSettings, updateServiceableLocations, getCoordinators, getCoordinatorById, updateCoordinatorApproval } from '../controllers/auth.controllers.js';
import { authRateLimiter, otpRateLimiter, passwordResetRateLimiter } from '../utils/rateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload } from '../middleware/upload.js';
import { ApprovalStatus, AvailabilityStatus, Caste, Gender, Gotra, VerificationStatus } from '../types/enums.js';
import { validate } from '../utils/validate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';

const router = Router()

// Validation Middleware
const registerValidation = [
    body("userEmail")
        .optional()
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),

    body("phoneNumber")
        .optional()
        .isMobilePhone("en-IN")
        .withMessage("Enter valid Indian Phone Number"),

    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(Object.values(Role))
        .withMessage("Invalid user type"),

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
            "Password must be at least 8 characters long and include uppercase, lowercase, and a number.",
        ),

    body().custom(({ userEmail, phoneNumber }) => {
        if (!userEmail && !phoneNumber) {
            throw new Error("Email or phone number is required");
        }

        return true;
    }),

    validate,
];

const socialRegisterValidation = [
    body("email")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),

    body("role")
        .exists()
        .withMessage("Role is required")
        .isIn(Object.values(Role))
        .withMessage("Invalid user type"),

    body("idToken")
        .notEmpty()
        .withMessage("Token is missing"),

    validate,
];

const profileValidation = [
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid User ID format"),

    body("fullName")
        .notEmpty()
        .withMessage("Full name is required")
        .isString()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Full name must be at least 2 characters"),

    body("email")
        .optional()
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),

    body("phoneNumber")
        .optional()
        .isMobilePhone("en-IN")
        .withMessage("Enter valid Indian Phone Number"),

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
            "Password must be at least 8 characters long and include uppercase, lowercase, and a number.",
        ),

    body("dob")
        .optional()
        .isISO8601()
        .withMessage("DOB must be a valid date (YYYY-MM-DD)")
        .toDate(),

    body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),

    body("caste")
        .optional()
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),

    body("gotra")
        .optional()
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),

    body("referralCode")
        .optional()
        .isString()
        .trim()
        .toUpperCase(),

    validate,
];

const updateProfileValidation = [
    body("fullName")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Full name must be at least 2 characters"),

    body("dob")
        .optional()
        .isISO8601()
        .withMessage("Invalid date of birth")
        .toDate(),

    body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender"),

    body("profileImage")
        .optional()
        .isURL()
        .withMessage("Profile image must be a valid URL"),

    body("savedLocations")
        .optional()
        .isArray()
        .withMessage("Saved locations must be an array"),

    body("savedLocations.*")
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Saved location cannot be empty"),

    validate,
];

const documentUploadValidation = [
    body().custom((value) => {
        if (
            !value.aadharCard &&
            !value.panCard &&
            !value.bankPassbook
        ) {
            throw new Error(
                "At least one document must be provided",
            );
        }

        return true;
    }),

    body("aadharCard")
        .optional()
        .isString()
        .withMessage("Invalid Aadhar document"),

    body("panCard")
        .optional()
        .isString()
        .withMessage("Invalid PAN document"),

    body("bankPassbook")
        .optional()
        .isString()
        .withMessage("Invalid passbook image format"),

    body("accountNumber")
        .if(body("bankPassbook").exists({ checkFalsy: true }))
        .notEmpty()
        .withMessage(
            "Account number is required when uploading bank passbook",
        )
        .isNumeric()
        .withMessage("Account number must contain only digits"),

    body("accountName")
        .if(body("bankPassbook").exists({ checkFalsy: true }))
        .notEmpty()
        .withMessage("Account holder name is required")
        .trim(),

    body("bankName")
        .if(body("bankPassbook").exists({ checkFalsy: true }))
        .notEmpty()
        .withMessage("Bank name is required")
        .trim(),

    body("ifscCode")
        .if(body("bankPassbook").exists({ checkFalsy: true }))
        .notEmpty()
        .withMessage("IFSC code is required")
        .toUpperCase()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .withMessage("Invalid IFSC code format"),

    validate,
];

const verificationStatusValidation = [
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid user ID"),

    body("type")
        .isIn(["document", "bank"])
        .withMessage("Type must be document or bank"),

    body("status")
        .isIn([
            VerificationStatus.APPROVED,
            VerificationStatus.REJECTED,
        ])
        .withMessage("Status must be APPROVED or REJECTED"),

    body("rejectionReason")
        .if(body("status").equals(VerificationStatus.REJECTED))
        .notEmpty()
        .withMessage("Rejection reason is required")
        .trim()
        .isLength({ min: 3, max: 500 }),

    validate,
];

export const coordinatorIdValidation = [
    param("coordinatorId")
        .notEmpty()
        .withMessage("Coordinator ID is required")
        .isMongoId()
        .withMessage("Invalid coordinator ID"),

    validate,
];

export const coordinatorApprovalValidation = [
    param("coordinatorId")
        .notEmpty()
        .withMessage("Coordinator ID is required")
        .isMongoId()
        .withMessage("Invalid coordinator ID"),

    body("status")
        .notEmpty()
        .withMessage("Approval status is required")
        .isIn(Object.values(ApprovalStatus))
        .withMessage("Invalid approval status"),

    body("rejectionReason")
        .if(body("status").equals(ApprovalStatus.REJECTED))
        .notEmpty()
        .withMessage("Rejection reason is required")
        .isString()
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage("Rejection reason must be between 3 and 500 characters"),

    validate,
];

export const coordinatorAvailabilityValidation = [
    body("availabilityStatus")
        .notEmpty()
        .withMessage("Availability status is required")
        .isIn(Object.values(AvailabilityStatus))
        .withMessage("Invalid availability status"),

    validate,
];

export const coordinatorSettingsValidation = [
    body("maxDailyBookings")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Maximum daily bookings must be between 1 and 50")
        .toInt(),

    body("autoAssignmentEnabled")
        .optional()
        .isBoolean()
        .withMessage("autoAssignmentEnabled must be boolean")
        .toBoolean(),

    body().custom((value) => {
        if (
            value.maxDailyBookings === undefined &&
            value.autoAssignmentEnabled === undefined
        ) {
            throw new Error("At least one coordinator setting is required");
        }

        return true;
    }),

    validate,
];

export const serviceableLocationsValidation = [
    body("serviceableLocations")
        .isArray()
        .withMessage("serviceableLocations must be an array"),

    body("serviceableLocations.*.locationId")
        .notEmpty()
        .withMessage("Location ID is required")
        .isMongoId()
        .withMessage("Invalid location ID"),

    body("serviceableLocations.*.caste")
        .optional()
        .isArray()
        .withMessage("Caste must be an array"),

    body("serviceableLocations.*.caste.*")
        .optional()
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),

    body("serviceableLocations.*.gotra")
        .optional()
        .isArray()
        .withMessage("Gotra must be an array"),

    body("serviceableLocations.*.gotra.*")
        .optional()
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),

    body("serviceableLocations").custom((locations) => {
        const locationIds = locations.map(
            (location: { locationId: string }) => location.locationId,
        );

        if (new Set(locationIds).size !== locationIds.length) {
            throw new Error("Duplicate serviceable locations are not allowed");
        }

        return true;
    }),

    validate,
];

export const coordinatorListValidation = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),

    query("approvalStatus")
        .optional()
        .isIn(Object.values(ApprovalStatus))
        .withMessage("Invalid approval status"),

    query("availabilityStatus")
        .optional()
        .isIn(Object.values(AvailabilityStatus))
        .withMessage("Invalid availability status"),

    query("locationId")
        .optional()
        .isMongoId()
        .withMessage("Invalid location ID"),

    query("caste")
        .optional()
        .isIn(Object.values(Caste))
        .withMessage("Invalid caste"),

    query("gotra")
        .optional()
        .isIn(Object.values(Gotra))
        .withMessage("Invalid gotra"),

    query("autoAssignmentEnabled")
        .optional()
        .isBoolean()
        .withMessage("autoAssignmentEnabled must be boolean")
        .toBoolean(),

    query("minimumRating")
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage("Minimum rating must be between 0 and 5")
        .toFloat(),

    query("search")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search cannot exceed 100 characters"),

    query("sortBy")
        .optional()
        .isIn([
            "createdAt",
            "fullName",
            "averageRating",
            "totalCompletedBookings",
            "acceptanceRate",
        ])
        .withMessage("Invalid sort field"),

    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be asc or desc"),

    validate,
];


// PUBLIC AUTH

router.post(
    "/register",
    registerValidation,
    register,
);

router.post(
    "/verify-otp",
    otpRateLimiter,
    verifyOtp,
);

router.post(
    "/resend-otp",
    otpRateLimiter,
    resendOtp,
);

router.post(
    "/login",
    authRateLimiter,
    login,
);

router.post(
    "/social",
    authRateLimiter,
    socialRegisterValidation,
    socialAuth,
);

router.post(
    "/refresh-token",
    refreshToken,
);

router.post(
    "/logout",
    logout,
);

// PASSWORD RECOVERY

router.post(
    "/forgot-password",
    passwordResetRateLimiter,
    forgotPassword,
);

router.post(
    "/reset-password",
    passwordResetRateLimiter,
    resetPassword,
);

// PROFILE COMPLETION 

router.patch(
    "/complete-profile",
    profileValidation,
    completeProfile,
);

// CURRENT USER

router.get(
    "/me",
    authenticate,
    getCurrentUser,
);

router.patch(
    "/update-profile",
    authenticate,
    updateProfileValidation,
    updateProfile,
);

router.post(
    "/change-password",
    authenticate,
    changePassword,
);

router.patch(
    "/upload-documents",
    authenticate,
    documentUploadValidation,
    submitVerificationDocuments,
);

// COORDINATOR SELF-MANAGEMENT

router.patch(
    "/coordinator/availability",
    authenticate,
    authorizeRoles(Role.COORDINATOR),
    coordinatorAvailabilityValidation,
    updateCoordinatorAvailability,
);

router.patch(
    "/coordinator/settings",
    authenticate,
    authorizeRoles(Role.COORDINATOR),
    coordinatorSettingsValidation,
    updateCoordinatorSettings,
);

router.put(
    "/coordinator/serviceable-locations",
    authenticate,
    authorizeRoles(Role.COORDINATOR),
    serviceableLocationsValidation,
    updateServiceableLocations,
);

// ADMIN USERS

router.get(
    "/get-all-user",
    authenticate,
    authorizeRoles(Role.ADMIN),
    getAllUsers,
);

router.get(
    "/get-user-by-email-or-phone/:identifier",
    authenticate,
    authorizeRoles(Role.ADMIN),
    getUserByEmailOrPhone,
);

router.get(
    "/get-user-by-id/:id",
    authenticate,
    authorizeRoles(Role.ADMIN),
    getUserById,
);

router.patch(
    "/deactivate-user/:id",
    authenticate,
    authorizeRoles(Role.ADMIN),
    body("status")
        .isBoolean()
        .withMessage("Status must be boolean")
        .toBoolean(),
    validate,
    deactivateUser,
);

router.patch(
    "/verify-documents",
    authenticate,
    authorizeRoles(Role.ADMIN),
    verificationStatusValidation,
    approveOrRejectDocs,
);

// ADMIN COORDINATORS

router.get(
    "/coordinators",
    authenticate,
    authorizeRoles(Role.ADMIN),
    coordinatorListValidation,
    getCoordinators,
);

router.get(
    "/coordinators/:coordinatorId",
    authenticate,
    authorizeRoles(Role.ADMIN),
    coordinatorIdValidation,
    getCoordinatorById,
);

router.patch(
    "/coordinators/:coordinatorId/approval",
    authenticate,
    authorizeRoles(Role.ADMIN),
    coordinatorApprovalValidation,
    updateCoordinatorApproval,
);

// UPLOADS

router.post(
    "/upload-single",
    authenticate,
    upload.single("image"),
    uploadSingle,
);

router.post(
    "/upload-multiple",
    authenticate,
    upload.array("images", 5),
    uploadMutliple,
);

export default router;