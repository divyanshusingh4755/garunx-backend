import { Router } from "express";
import { body, param, query } from "express-validator";
import { createReview, editReview, moderateReview, getAllReviews, getMyBookingReview, getMyReviews, getCoordinatorReviews, exportReviewsCsv } from "../controllers/review.controllers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";
import { validate } from "../utils/validate.js";

const router = Router();

const REVIEW_DIRECTIONS = ["CUSTOMER_TO_COORDINATOR", "COORDINATOR_TO_CUSTOMER",] as const;
const REVIEW_VISIBILITIES = ["PUBLISHED", "HIDDEN", "UNPUBLISHED"] as const;
const MODERATION_STATUSES = ["CLEAN", "FLAGGED"] as const;
const SORT_FIELDS = ["createdAt", "updatedAt", "rating", "editedAt"] as const;

const commonListValidation = [
  query("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5").toInt(),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be greater than 0").toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),
  query("sortBy").optional().isIn(SORT_FIELDS).withMessage("Invalid sort field"),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("Sort order must be asc or desc"),
];

export const createReviewValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking id"),
  body("rating").exists().withMessage("Rating is required").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5").toInt(),
  body("review").optional({ nullable: true }).isString().withMessage("Review must be a string").trim().isLength({ max: 1000 }).withMessage("Review cannot exceed 1000 characters"),
  body("imageUrl").optional({ nullable: true }).isString().withMessage("Image URL must be a string").trim().isLength({ max: 2000 }).withMessage("Image URL cannot exceed 2000 characters").isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("Image URL must be a valid HTTP or HTTPS URL"),
  validate,
];

export const editReviewValidation = [
  param("reviewId").isMongoId().withMessage("Invalid review id"),
  body().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Request body must be an object");
    }

    const allowedFields = ["rating", "review", "imageUrl",];
    const suppliedFields = Object.keys(value);

    if (suppliedFields.length === 0) {
      throw new Error("At least one field is required");
    }

    const invalidFields = suppliedFields.filter((field) => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
    }

    return true;
  }),

  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5").toInt(),
  body("review").optional({ nullable: true }).isString().withMessage("Review must be a string").trim().isLength({ max: 1000 }).withMessage("Review cannot exceed 1000 characters"),
  body("imageUrl").optional({ nullable: true }).isString().withMessage("Image URL must be a string").trim().isLength({ max: 2000 }).withMessage("Image URL cannot exceed 2000 characters").isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("Image URL must be a valid HTTP or HTTPS URL"),
  validate,
];

export const moderateReviewValidation = [
  param("reviewId").isMongoId().withMessage("Invalid review id"),
  body("action").exists().withMessage("Moderation action is required").isIn(["HIDE", "UNPUBLISH", "PUBLISH", "FLAG", "UNFLAG", "DELETE"]).withMessage("Invalid moderation action"),
  body("reason").optional({ nullable: true }).isString().withMessage("Reason must be a string").trim().isLength({ max: 1000 }).withMessage("Reason cannot exceed 1000 characters"),
  validate,
];

export const getMyBookingReviewValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking id"),
  validate,
];

export const getMyReviewsValidation = [
  query("direction").optional().isIn(REVIEW_DIRECTIONS).withMessage("Invalid review direction"),
  ...commonListValidation,
  validate,
];

export const getCoordinatorReviewsValidation = [
  param("coordinatorId").isMongoId().withMessage("Invalid coordinator id"),
  ...commonListValidation,
  validate,
];

export const getAllReviewsValidation = [
  query("direction").optional().isIn(REVIEW_DIRECTIONS).withMessage("Invalid review direction"),
  query("visibility").optional().isIn(REVIEW_VISIBILITIES).withMessage("Invalid review visibility"),
  query("moderationStatus").optional().isIn(MODERATION_STATUSES).withMessage("Invalid moderation status"),
  query("isDeleted").optional().isBoolean().withMessage("isDeleted must be true or false"),
  query("reviewerId").optional().isMongoId().withMessage("Invalid reviewer id"),
  query("revieweeId").optional().isMongoId().withMessage("Invalid reviewee id"),
  query("bookingId").optional().isMongoId().withMessage("Invalid booking id"),
  ...commonListValidation,
  validate,
];

const exportReviewsValidation = [
  body("reviewIds")
    .isArray({ min: 1, max: 1000 }).withMessage("reviewIds must contain between 1 and 1000 review IDs"),
  body("reviewIds.*").isMongoId().withMessage("Each reviewId must be a valid MongoDB ID"),
  body("reviewIds").custom((reviewIds) => {
    if (!Array.isArray(reviewIds)) { return true; }

    const uniqueIds = new Set(reviewIds);

    if (uniqueIds.size !== reviewIds.length) {
      throw new Error("Duplicate review IDs are not allowed");
    }

    return true;
  }),
  validate,
];

// PUBLIC - COORDINATOR REVIEWS
router.get("/coordinator/:coordinatorId", getCoordinatorReviewsValidation, getCoordinatorReviews);

// AUTHENTICATED USER / COORDINATOR - BOOKING REVIEW LOOKUP
router.get("/booking/:bookingId/my-review", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), getMyBookingReviewValidation, getMyBookingReview);

// AUTHENTICATED USER / COORDINATOR - OWN REVIEWS
router.get("/my-reviews", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), getMyReviewsValidation, getMyReviews);

// ADMIN - REVIEW LIST / EXPORT
router.get("/get-all-reviews", authenticate, authorizeRoles(Role.ADMIN), requirePermission("review.read_all"), getAllReviewsValidation, getAllReviews);
router.post("/export", authenticate, authorizeRoles(Role.ADMIN), requirePermission("review.read_all"), exportReviewsValidation, exportReviewsCsv);

// USER / COORDINATOR - CREATE REVIEW
router.post("/booking/:bookingId", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), createReviewValidation, createReview);

// ADMIN - SPECIFIC REVIEW ACTION
router.patch("/:reviewId/moderation", authenticate, authorizeRoles(Role.ADMIN), requirePermission("review.moderate"), moderateReviewValidation, moderateReview);

// USER / COORDINATOR - GENERIC REVIEW UPDATE
// Keep this last among /:reviewId routes.
router.patch("/:reviewId", authenticate, authorizeRoles(Role.USER, Role.COORDINATOR), editReviewValidation, editReview);

export default router;