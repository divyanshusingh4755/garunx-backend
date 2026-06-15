import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import {
  expirePayments,
  getAllBookings,
  getBookingById,
  getBookingStats,
  paymentStatus,
  refundBooking,
  retryPayment,
  updateBookingNotes,
  updateBookingSchedule,
  updateBookingStatus,
} from "../controllers/booking.controllers.js";

const router = Router();

router.get("/get-all-bookings", getAllBookings);
router.get("/stats", authenticate, getBookingStats);
router.get("/:bookingId", authenticate, getBookingById);
router.get("/:cartId/payment-status", authenticate, paymentStatus);
router.post("/:bookingId/retry-payment", authenticate, retryPayment);
router.post("/:bookingId/status", authenticate, updateBookingStatus);
router.post("/:bookingId/refund", authenticate, refundBooking);
router.post("/system/expire-payments", expirePayments);
router.patch("/:bookingId/notes", authenticate, updateBookingNotes);
router.patch("/:bookingId/schedule", authenticate, updateBookingSchedule);

export default router;
