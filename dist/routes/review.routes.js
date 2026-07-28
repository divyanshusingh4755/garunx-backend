import { Router, } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createReview, editReview, moderateReview, getAllReviews, getMyBookingReview, getMyReviews, getCoordinatorReviews } from "../controllers/review.controllers.js";
import { body, param, query, validationResult } from "express-validator";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
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
    next();
};
export const createReviewValidation = [
    param("bookingId")
        .notEmpty()
        .withMessage("Booking id is required")
        .isMongoId()
        .withMessage("Invalid booking id"),
    body("rating")
        .notEmpty()
        .withMessage("Rating is required")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
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
        .isURL()
        .withMessage("Image URL must be a valid URL"),
    validate,
];
export const editReviewValidation = [
    param("reviewId")
        .notEmpty()
        .withMessage("Review id is required")
        .isMongoId()
        .withMessage("Invalid review id"),
    body("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
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
        .isURL()
        .withMessage("Image URL must be a valid URL"),
    body()
        .custom((value) => {
        const hasRating = value.rating !== undefined;
        const hasReview = value.review !== undefined;
        const hasImageUrl = value.imageUrl !== undefined;
        if (!hasRating &&
            !hasReview &&
            !hasImageUrl) {
            throw new Error("At least rating, review or imageUrl is required");
        }
        return true;
    }),
    validate,
];
export const moderateReviewValidation = [
    param("reviewId")
        .notEmpty()
        .withMessage("Review id is required")
        .isMongoId()
        .withMessage("Invalid review id"),
    body("action")
        .notEmpty()
        .withMessage("Moderation action is required")
        .isIn([
        "HIDE",
        "UNPUBLISH",
        "PUBLISH",
        "FLAG",
        "UNFLAG",
        "DELETE",
    ])
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
    param("bookingId")
        .notEmpty()
        .withMessage("Booking id is required")
        .isMongoId()
        .withMessage("Invalid booking id"),
    validate,
];
export const getMyReviewsValidation = [
    query("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    query("direction")
        .optional()
        .isIn([
        "CUSTOMER_TO_COORDINATOR",
        "COORDINATOR_TO_CUSTOMER",
    ])
        .withMessage("Invalid review direction"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be greater than 0"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    query("sortBy")
        .optional()
        .isIn([
        "createdAt",
        "updatedAt",
        "rating",
        "editedAt",
    ])
        .withMessage("Invalid sort field"),
    query("sortOrder")
        .optional()
        .isIn([
        "asc",
        "desc",
    ])
        .withMessage("Sort order must be asc or desc"),
    validate,
];
export const getCoordinatorReviewsValidation = [
    param("coordinatorId")
        .notEmpty()
        .withMessage("Coordinator id is required")
        .isMongoId()
        .withMessage("Invalid coordinator id"),
    query("rating")
        .optional()
        .isInt({
        min: 1,
        max: 5,
    })
        .withMessage("Rating must be between 1 and 5"),
    query("page")
        .optional()
        .isInt({
        min: 1,
    })
        .withMessage("Page must be greater than 0"),
    query("limit")
        .optional()
        .isInt({
        min: 1,
        max: 100,
    })
        .withMessage("Limit must be between 1 and 100"),
    query("sortBy")
        .optional()
        .isIn([
        "createdAt",
        "updatedAt",
        "rating",
        "editedAt",
    ])
        .withMessage("Invalid sort field"),
    query("sortOrder")
        .optional()
        .isIn([
        "asc",
        "desc",
    ])
        .withMessage("Sort order must be asc or desc"),
    validate,
];
const router = Router();
router.get("/coordinator/:coordinatorId", getCoordinatorReviewsValidation, getCoordinatorReviews);
router.get("/booking/:bookingId/my-review", authenticate, getMyBookingReviewValidation, getMyBookingReview);
router.get("/my-reviews", authenticate, getMyReviewsValidation, getMyReviews);
router.post("/booking/:bookingId", authenticate, createReviewValidation, createReview);
router.patch("/:reviewId", authenticate, editReviewValidation, editReview);
router.patch("/:reviewId/moderation", authenticate, authorizeRoles(Role.ADMIN), moderateReviewValidation, moderateReview);
router.get("/get-all-reviews", authenticate, authorizeRoles(Role.ADMIN), getAllReviews);
export default router;
//# sourceMappingURL=review.routes.js.map