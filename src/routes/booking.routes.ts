import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { body, param, query, validationResult } from "express-validator";

import { authenticate } from "../middleware/authenticate.js";

import {
  paymentStatus,
  retryPayment,
  expirePayments,
  getMyBookings,
  getMyBookingById,
  cancelBooking,
  rescheduleBooking,
  updateBookingNotes,
  getAllBookings,
  getBookingById,
  getBookingStats,
  searchBookings,
  updateBookingStatus,
  refundBooking,
  getAvailableCoordinators,
  selectCoordinator,
  respondToAssignment,
  requestReassignment,
  getCoordinatorBookingList,
  processAssignmentTimeouts,
  getBookingExecution,
  markCoordinatorArrived,
  verifyBookingOtp,
  startBookingService,
  completeBookingService,
  skipBookingService,
  addBookingMilestone,
  completeBookingExecution,
  generateBookingOtp,
  getBookingInvoice,
  getBeneficiaryBooking,
} from "../controllers/booking.controllers.js";

import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";
import { requirePermission } from "../middleware/rbac.js";

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
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

const bookingIdValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  validate,
];

const cartIdValidation = [
  param("cartId").isMongoId().withMessage("Invalid cart ID"),
  validate,
];

const executionValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  param("executionId").isUUID().withMessage("Invalid execution ID"),
  validate,
];

router.get(
  "/my-bookings",
  authenticate,
  authorizeRoles(Role.USER),
  getMyBookings,
);

router.get(
  "/my-bookings/:bookingId",
  authenticate,
  authorizeRoles(Role.USER),
  bookingIdValidation,
  getMyBookingById,
);

router.get(
  "/:cartId/payment-status",
  authenticate,
  authorizeRoles(Role.USER),
  cartIdValidation,
  paymentStatus,
);

router.post(
  "/:bookingId/retry-payment",
  authenticate,
  authorizeRoles(Role.USER),
  bookingIdValidation,
  retryPayment,
);

router.post(
  "/:bookingId/cancel",
  authenticate,
  authenticate,
  authorizeRoles(Role.USER),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Cancellation reason is required")
    .isLength({ max: 500 })
    .withMessage("Cancellation reason cannot exceed 500 characters"),
  validate,
  cancelBooking,
);

router.patch(
  "/:bookingId/reschedule",
  authenticate,
  authorizeRoles(Role.USER),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("scheduledAt").isISO8601().withMessage("Valid scheduledAt is required"),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Reschedule reason is required")
    .isLength({ max: 500 })
    .withMessage("Reschedule reason cannot exceed 500 characters"),
  validate,
  rescheduleBooking,
);

router.patch(
  "/:bookingId/notes",
  authenticate,
  authorizeRoles(Role.USER),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("notes")
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
  validate,
  updateBookingNotes,
);

router.get(
  "/coordinator/bookings",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  getCoordinatorBookingList,
);

router.get(
  "/:bookingId/available-coordinators",
  authenticate,
  authorizeRoles(Role.USER),
  bookingIdValidation,
  getAvailableCoordinators,
);

router.post(
  "/:bookingId/assignment/select",
  authenticate,
  authorizeRoles(Role.USER),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("coordinatorId").isMongoId().withMessage("Invalid coordinator ID"),
  body("scheduledAt").optional().isISO8601().withMessage("Invalid scheduledAt"),
  body("rescheduleReason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reschedule reason cannot exceed 500 characters"),
  validate,
  selectCoordinator,
);

router.post(
  "/:bookingId/assignment/respond",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("action")
    .isIn(["ACCEPT", "REJECT"])
    .withMessage("Action must be ACCEPT or REJECT"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
  validate,
  respondToAssignment,
);

router.post(
  "/:bookingId/assignment/reassign",
  authenticate,
  authorizeRoles(
    Role.USER,
    Role.COORDINATOR,
  ),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Reassignment reason is required")
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
  validate,
  requestReassignment,
);

router.get(
  "/:bookingId/execution",
  authenticate,
  authorizeRoles(
    Role.USER,
    Role.COORDINATOR,
  ),
  bookingIdValidation,
  getBookingExecution,
);

router.post(
  "/:bookingId/execution/arrived",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  bookingIdValidation,
  markCoordinatorArrived,
);

router.post(
  "/:bookingId/execution/verify-otp",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("otp")
    .matches(/^\d{6}$/)
    .withMessage("OTP must contain exactly 6 digits"),
  validate,
  verifyBookingOtp,
);

router.post(
  "/:bookingId/execution/services/:executionId/start",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  executionValidation,
  startBookingService,
);

router.post(
  "/:bookingId/execution/services/:executionId/complete",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  executionValidation,
  completeBookingService,
);

router.post(
  "/:bookingId/execution/services/:executionId/skip",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  param("executionId").isUUID().withMessage("Invalid execution ID"),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Skip reason is required")
    .isLength({ max: 500 })
    .withMessage("Skip reason cannot exceed 500 characters"),
  validate,
  skipBookingService,
);

router.post(
  "/:bookingId/execution/milestones",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("code").isString().notEmpty().withMessage("Milestone code is required"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
  validate,
  addBookingMilestone,
);

router.post(
  "/:bookingId/execution/complete",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("proofUrls")
    .isArray({ min: 1 })
    .withMessage("At least one completion proof is required"),
  body("proofUrls.*").isURL().withMessage("Every proof URL must be valid"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
  validate,
  completeBookingExecution,
);

router.post(
  "/:bookingId/execution/generate-otp",
  authenticate,
  authorizeRoles(Role.COORDINATOR),
  bookingIdValidation,
  generateBookingOtp,
);

router.post(
  "/system/expire-payments",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission(
    "booking.expire_payments",
  ),
  expirePayments,
);

router.post(
  "/system/expire-payments",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission(
    "booking.expire_payments",
  ),
  expirePayments,
);

router.get(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.read"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc"),
  validate,
  getAllBookings,
);

router.get(
  "/stats",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.stats"),
  getBookingStats,
);

router.get(
  "/search",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.search"),
  query("query")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Search query is required"),
  validate,
  searchBookings,
);

router.patch(
  "/:bookingId/status",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.status"),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage(
      "Reason cannot exceed 500 characters",
    ),
  body("status")
    .isIn([
      "PENDING_PAYMENT",
      "CONFIRMED",
      "ASSIGNMENT_PENDING",
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "EXPIRED",
    ])
    .withMessage("Invalid booking status"),
  validate,
  updateBookingStatus,
);

router.post(
  "/:bookingId/refund",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.refund"),
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Refund amount must be greater than zero")
    .toFloat(),
  body("reason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Refund reason is required")
    .isLength({ max: 500 })
    .withMessage("Refund reason cannot exceed 500 characters"),
  validate,
  refundBooking,
);

router.get(
  "/:bookingId/invoice",
  authenticate,
  authorizeRoles(Role.USER),
  bookingIdValidation,
  getBookingInvoice,
);

router.get(
  "/admin/:bookingId/invoice",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.read"),
  bookingIdValidation,
  getBookingInvoice,
);

router.get(
  "/view/:token",
  param("token")
    .isString()
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid booking access token"),
  validate,
  getBeneficiaryBooking,
);

router.get(
  "/:bookingId",
  authenticate,
  authorizeRoles(Role.ADMIN),
  requirePermission("booking.read"),
  bookingIdValidation,
  getBookingById,
);

export default router;
