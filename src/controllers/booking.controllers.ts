import type { Request, Response } from "express";
import { BookingService } from "../services/booking.service.js";

export const paymentWebhooks = async (req: Request, res: Response) => {
  try {
    await BookingService.process(req);

    return res.status(200).json({
      success: true,
    });
  } catch (error: any) {
    console.error("Cashfree webhook error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Payment webhook processing failed",
    });
  }
};

export const retryPayment = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const result = await BookingService.retryPayment(
      bookingId as string,
      userId,
    );

    return res.status(200).json({
      success: true,
      message: "Payment session generated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Retry payment error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to retry payment",
    });
  }
};

export const paymentStatus = async (req: Request, res: Response) => {
  try {
    const { cartId } = req.params;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    const result = await BookingService.getPaymentStatus(
      cartId as string,
      userId,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Payment status error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch payment status",
    });
  }
};

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const {
      searchTerm,
      status,
      paymentStatus,
      userId,
      bookingReference,
      fromDate,
      toDate,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await BookingService.findBookings({
      searchTerm: searchTerm as string,
      status: status as string,
      paymentStatus: paymentStatus as string,
      userId: userId as string,
      bookingReference: bookingReference as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      limit: Number(limit) || 20,
      page: Number(page) || 1,
      sortBy: (sortBy as string) || "createdAt",
      sortOrder: (sortOrder as "asc" | "desc") || "desc",
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      currentPage: result.page,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const result = await BookingService.getBookingById(bookingId as string);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch booking",
    });
  }
};

export const getBookingStats = async (req: Request, res: Response) => {
  try {
    const result = await BookingService.getBookingStats();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBookingNotes = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;

    const result = await BookingService.updateBookingNotes(
      bookingId as string,
      notes,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBookingSchedule = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { scheduledAt } = req.body;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await BookingService.updateBookingSchedule(
      bookingId as string,
      scheduledAt,
      userId,
      req.user!.role,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await BookingService.updateBookingStatus(
      bookingId as string,
      status,
      userId,
      req.user!.role,
      reason,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const refundBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { amount, reason } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await BookingService.refundBooking(
      bookingId as string,
      Number(amount),
      reason,
      userId,
    );

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const expirePayments = async (req: Request, res: Response) => {
  try {
    const result = await BookingService.expirePendingPayments();

    return res.status(200).json({
      success: true,
      message: `${result.expiredBookings} bookings expired`,
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
