import { Router, } from "express";
import { body, param, query, validationResult } from "express-validator";
import { createReview, editReview, moderateReview, getAllReviews, getMyBookingReview, getMyReviews, getCoordinatorReviews, } from "../controllers/review.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
const router = Router();
const REVIEW_DIRECTIONS = [
    "CUSTOMER_TO_COORDINATOR",
    "COORDINATOR_TO_CUSTOMER",
];
const REVIEW_VISIBILITIES = ["PUBLISHED", "HIDDEN", "UNPUBLISHED"];
const MODERATION_STATUSES = ["CLEAN", "FLAGGED"];
const SORT_FIELDS = ["createdAt", "updatedAt", "rating", "editedAt"];
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            success: false,
            message: firstError?.msg,
            error: firstError,
        });
    }
    return next();
};
const commonListValidation = [
    query("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5")
        .toInt(),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be greater than 0")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    query("sortBy")
        .optional()
        .isIn(SORT_FIELDS)
        .withMessage("Invalid sort field"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be asc or desc"),
];
export const createReviewValidation = [
    param("bookingId").isMongoId().withMessage("Invalid booking id"),
    body("rating")
        .exists()
        .withMessage("Rating is required")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5")
        .toInt(),
    body("review")
        .optional({ nullable: true })
        .isString()
        .withMessage("Review must be a string")
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Review cannot exceed 1000 characters"),
    body("imageUrl")
        .optional({ nullable: true })
        .isString()
        .withMessage("Image URL must be a string")
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Image URL cannot exceed 2000 characters")
        .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
    })
        .withMessage("Image URL must be a valid HTTP or HTTPS URL"),
    validate,
];
export const editReviewValidation = [
    param("reviewId").isMongoId().withMessage("Invalid review id"),
    body().custom((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Request body must be an object");
        }
        const hasEditableField = ["rating", "review", "imageUrl"].some((field) => Object.prototype.hasOwnProperty.call(value, field));
        if (!hasEditableField) {
            throw new Error("At least rating, review or imageUrl is required");
        }
        return true;
    }),
    body("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5")
        .toInt(),
    body("review")
        .optional({ nullable: true })
        .isString()
        .withMessage("Review must be a string")
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Review cannot exceed 1000 characters"),
    body("imageUrl")
        .optional({ nullable: true })
        .isString()
        .withMessage("Image URL must be a string")
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Image URL cannot exceed 2000 characters")
        .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
    })
        .withMessage("Image URL must be a valid HTTP or HTTPS URL"),
    validate,
];
export const moderateReviewValidation = [
    param("reviewId").isMongoId().withMessage("Invalid review id"),
    body("action")
        .exists()
        .withMessage("Moderation action is required")
        .isIn(["HIDE", "UNPUBLISH", "PUBLISH", "FLAG", "UNFLAG", "DELETE"])
        .withMessage("Invalid moderation action"),
    body("reason")
        .optional({ nullable: true })
        .isString()
        .withMessage("Reason must be a string")
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Reason cannot exceed 1000 characters"),
    validate,
];
export const getMyBookingReviewValidation = [
    param("bookingId").isMongoId().withMessage("Invalid booking id"),
    validate,
];
export const getMyReviewsValidation = [
    query("direction")
        .optional()
        .isIn(REVIEW_DIRECTIONS)
        .withMessage("Invalid review direction"),
    ...commonListValidation,
    validate,
];
export const getCoordinatorReviewsValidation = [
    param("coordinatorId").isMongoId().withMessage("Invalid coordinator id"),
    ...commonListValidation,
    validate,
];
export const getAllReviewsValidation = [
    query("direction")
        .optional()
        .isIn(REVIEW_DIRECTIONS)
        .withMessage("Invalid review direction"),
    query("visibility")
        .optional()
        .isIn(REVIEW_VISIBILITIES)
        .withMessage("Invalid review visibility"),
    query("moderationStatus")
        .optional()
        .isIn(MODERATION_STATUSES)
        .withMessage("Invalid moderation status"),
    query("isDeleted")
        .optional()
        .isBoolean()
        .withMessage("isDeleted must be true or false"),
    query("reviewerId").optional().isMongoId().withMessage("Invalid reviewer id"),
    query("revieweeId").optional().isMongoId().withMessage("Invalid reviewee id"),
    query("bookingId").optional().isMongoId().withMessage("Invalid booking id"),
    ...commonListValidation,
    validate,
];
router.get("/coordinator/:coordinatorId", getCoordinatorReviewsValidation, getCoordinatorReviews);
router.get("/booking/:bookingId/my-review", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), getMyBookingReviewValidation, getMyBookingReview);
router.get("/my-reviews", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), getMyReviewsValidation, getMyReviews);
router.get("/get-all-reviews", authenticate, authorizeRoles(Role.ADMIN), requirePermission("review.read_all"), getAllReviewsValidation, getAllReviews);
router.post("/booking/:bookingId", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), createReviewValidation, createReview);
router.patch("/:reviewId/moderation", authenticate, authorizeRoles(Role.ADMIN), requirePermission("review.moderate"), moderateReviewValidation, moderateReview);
router.patch("/:reviewId", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), editReviewValidation, editReview);
export default router;
//# sourceMappingURL=review.routes.js.map