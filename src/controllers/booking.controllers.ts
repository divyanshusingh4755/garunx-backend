import type { Request, Response } from "express";
import { BookingService } from "../services/booking.service.js";

export const paymentWebhooks = async (req: Request, res: Response) => {
  try {
    console.log("Webhook received");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
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
