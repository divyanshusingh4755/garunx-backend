import type { Request } from "express";
import { CashfreeService } from "./cashfree.service.js";
import { Booking } from "../models/booking.model.js";
import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";

export class BookingService {
  static async process(req: Request) {
    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString("utf-8")
        : JSON.stringify(req.body);

    const signature = req.header("x-cashfree-signature") || "";

    // Verfiy signature
    const valid = CashfreeService.verifyWebhookSignature(rawBody, signature);

    if (!valid) {
      throw new Error("Invalid webhook signature");
    }

    const payload =
      typeof req.body === "object" ? req.body : JSON.parse(rawBody);
    const orderId = payload?.data?.order?.order_id;
    const paymentId = payload?.data?.payment?.cf_payment_id;
    const paymentStatus = payload?.data?.payment?.payment_status;
    const paymentAmount = payload?.data?.payment?.payment_amount;

    if (!orderId) {
      throw new Error("Missing order id");
    }

    const booking = await Booking.findOne({ bookingReference: orderId });
    if (!booking) {
      throw new Error(`Booking not found for ${orderId}`);
    }

    if (booking.payment.status === "PAID") {
      return;
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        if (paymentStatus === "SUCCESS") {
          await Booking.updateOne(
            { _id: booking._id },
            {
              $set: {
                "payment.status": "PAID",
                "payment.amountPaid": paymentAmount,
                "payment.providerPaymentId": paymentId,
                "payment.gateway": "CASHFREE",
                "payment.paidAt": new Date(),
                status: "CONFIRMED",
                "lifecycle.confirmedAt": new Date(),
              },
            },
            { session },
          );
          await Cart.updateOne(
            { _id: booking.cartId },
            {
              $set: { status: "CHECKED_OUT", checkedOutAt: new Date() },
              $unset: { checkoutExpiresAt: 1 },
            },
            { session },
          );
          return;
        }

        if (paymentStatus === "FAILED") {
          await Booking.updateOne(
            { _id: booking._id },
            { $set: { "payment.status": "FAILED" } },
            { session },
          );
          return;
        }

        await Booking.updateOne(
          { _id: booking._id },
          { $set: { "payment.status": "PENDING" } },
          { session },
        );
      });
    } catch (error: any) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async retryPayment(bookingId: string, userId: string) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment.status === "PAID") {
      throw new Error("Booking already paid");
    }

    if (booking.status === "CANCELLED") {
      throw new Error("Booking cancelled");
    }

    if (booking.status === "COMPLETED") {
      throw new Error("Booking already completed");
    }

    // STEP 1: check existing order
    if (booking.payment.providerOrderId) {
      const order = await CashfreeService.getOrder(
        booking.payment.providerOrderId,
      );

      // CASE 1: reuse
      if (order.order_status === "ACTIVE") {
        return {
          paymentSessionId: booking.payment.paymentSessionId,
        };
      }

      if (order.order_status === "PAID") {
        throw new Error("Payment Already done");
      }
    }

    const newOrderId = `${booking.bookingReference}-${Date.now()}`;

    const order = await CashfreeService.createOrder({
      orderId: newOrderId,
      amount: booking.pricing.grandTotal,
      customerName: booking.customerDetails?.name || "Customer",
      customerEmail: booking.customerDetails?.email || "",
      customerPhone: booking.customerDetails?.phone || "",
      userId: userId,
    });

    await Booking.updateOne(
      {
        _id: booking._id,
      },
      {
        $set: {
          "payment.providerOrderId": order.order_id,
          "payment.paymentSessionId": order.payment_session_id,
          "payment.lastAttemptAt": new Date(),
        },
        $inc: {
          "payment.attempts": 1,
        },
      },
    );
    return {
      paymentSessionId: order.payment_session_id,
    };
  }

  static async getPaymentStatus(cartId: string, userId: string) {
    const cart = await Cart.findOne({ _id: cartId, userId });

    if (!cart?.activeBookingId) {
      return {
        hasPendingPayment: false,
        paymentStatus: null,
        bookingStatus: null,
      };
    }

    const booking = await Booking.findById(cart.activeBookingId);

    if (!booking) {
      return {
        hasPendingPayment: false,
        paymentStatus: null,
        bookingStatus: null,
      };
    }

    let cashfreeStatus = null;

    if (booking.payment.providerOrderId) {
      try {
        const order = await CashfreeService.getOrder(
          booking.payment.providerOrderId,
        );

        cashfreeStatus = order.order_status;
      } catch (err) {
        console.error(err);
        cashfreeStatus = "UNKNOWN";
      }
    }

    // Sync DB if needed
    if (cashfreeStatus === "PAID" && booking.payment.status !== "PAID") {
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            "payment.status": "PAID",
            status: "CONFIRMED",
          },
        },
      );
    }

    const hasPending =
      cashfreeStatus === "ACTIVE" || cashfreeStatus === "PENDING";

    const canRetry =
      cashfreeStatus === "EXPIRED" ||
      cashfreeStatus === "FAILED" ||
      cashfreeStatus === "UNKNOWN";

    return {
      hasPendingPayment: hasPending,
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      bookingStatus: booking.status,
      paymentStatus: booking.payment.status,
      cashfreeOrderStatus: cashfreeStatus,
      totalAmount: booking.pricing.grandTotal,
      canRetry,
      paymentSessionId: booking.payment.paymentSessionId,
    };
  }
}
