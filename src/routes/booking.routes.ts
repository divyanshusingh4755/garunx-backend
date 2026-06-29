import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import {
  cancelBooking,
  expirePayments,
  getAllBookings,
  getBookingById,
  getBookingStats,
  getMyBookingById,
  getMyBookings,
  paymentStatus,
  refundBooking,
  retryPayment,
  updateBookingNotes,
  updateBookingSchedule,
  updateBookingStatus,
} from "../controllers/booking.controllers.js";

const router = Router();

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
  "/:bookingId/schedule",
  authenticate,
  updateBookingSchedule,
);

router.patch(
  "/:bookingId/notes",
  authenticate,
  updateBookingNotes,
);


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

router.get(
  "/:bookingId",
  authenticate,
  getBookingById,
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

router.post(
  "/system/expire-payments",
  expirePayments,
);

export default router;