import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";

import {
  // Payment
  paymentStatus,
  retryPayment,
  expirePayments,

  // Customer bookings
  getMyBookings,
  getMyBookingById,
  cancelBooking,
  rescheduleBooking,
  updateBookingNotes,

  // General/Admin booking management
  getAllBookings,
  getBookingById,
  getBookingStats,
  searchBookings,
  updateBookingStatus,
  refundBooking,

  // Coordinator discovery and assignment
  getAvailableCoordinators,
  selectCoordinator,
  respondToAssignment,
  requestReassignment,
  getCoordinatorAssignmentRequests,
  getCoordinatorBookings,
  processAssignmentTimeouts,

  // Booking execution
  getBookingExecution,
  markCoordinatorArrived,
  verifyBookingOtp,
  startBookingService,
  completeBookingService,
  skipBookingService,
  addBookingMilestone,
  completeBookingExecution,
  generateBookingOtp,
} from "../controllers/booking.controllers.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { Role } from "../types/rbac.js";

const router = Router();

// CUSTOMER BOOKING ROUTES

router.get(
  "/my-bookings",
  authenticate,
  getMyBookings,
);

router.get(
  "/my-bookings/:bookingId",
  authenticate,
  getMyBookingById,
);

router.get(
  "/:cartId/payment-status",
  authenticate,
  paymentStatus,
);

router.post(
  "/:bookingId/retry-payment",
  authenticate,
  retryPayment,
);

router.post(
  "/:bookingId/cancel",
  authenticate,
  cancelBooking,
);

router.patch(
  "/:bookingId/reschedule",
  authenticate,
  rescheduleBooking,
);

router.patch(
  "/:bookingId/notes",
  authenticate,
  updateBookingNotes,
);


//  COORDINATOR ROUTES
//  Keep these before the generic /:bookingId route.

router.get(
  "/coordinator/assignment-requests",
  authenticate,
  getCoordinatorAssignmentRequests,
);

router.get(
  "/coordinator/bookings",
  authenticate,
  getCoordinatorBookings,
);

// COORDINATOR ASSIGNMENT ROUTES

router.get(
  "/:bookingId/available-coordinators",
  authenticate,
  getAvailableCoordinators,
);

router.post(
  "/:bookingId/assignment/select",
  authenticate,
  selectCoordinator,
);

router.post(
  "/:bookingId/assignment/respond",
  authenticate,
  respondToAssignment,
);

router.post(
  "/:bookingId/assignment/reassign",
  authenticate,
  requestReassignment,
);

// BOOKING EXECUTION ROUTES

router.get(
  "/:bookingId/execution",
  authenticate,
  getBookingExecution,
);

router.post(
  "/:bookingId/execution/arrived",
  authenticate,
  markCoordinatorArrived,
);

router.post(
  "/:bookingId/execution/verify-otp",
  authenticate,
  verifyBookingOtp,
);

router.post(
  "/:bookingId/execution/services/:executionId/start",
  authenticate,
  startBookingService,
);

router.post(
  "/:bookingId/execution/services/:executionId/complete",
  authenticate,
  completeBookingService,
);

router.post(
  "/:bookingId/execution/services/:executionId/skip",
  authenticate,
  skipBookingService,
);

router.post(
  "/:bookingId/execution/milestones",
  authenticate,
  addBookingMilestone,
);

router.post(
  "/:bookingId/execution/complete",
  authenticate,
  completeBookingExecution,
);

router.post(
  "/:bookingId/execution/generate-otp",
  authenticate,
  generateBookingOtp,
);

// SYSTEM / SCHEDULED JOB ROUTES

router.post(
  "/system/expire-payments",
  authenticate,
  authorizeRoles(Role.ADMIN),
  expirePayments,
);

router.post(
  "/system/process-assignment-timeouts",
  authenticate,
  authorizeRoles(Role.ADMIN),
  processAssignmentTimeouts,
);

// GENERAL / ADMIN BOOKING ROUTES

router.get(
  "/",
  authenticate,
  getAllBookings,
);

router.get(
  "/stats",
  authenticate,
  getBookingStats,
);

// Search bookings using email or phone.
// Mainly used for bookingFor: OTHER.
router.get(
  "/search",
  authenticate,
  searchBookings,
);

router.patch(
  "/:bookingId/status",
  authenticate,
  updateBookingStatus,
);

router.post(
  "/:bookingId/refund",
  authenticate,
  refundBooking,
);

// Can be used to fetch booking status/details for bookingFor: OTHER.
router.get(
  "/:bookingId",
  authenticate,
  getBookingById,
);

export default router;