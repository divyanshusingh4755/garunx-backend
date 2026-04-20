import type { Request, Response } from "express";
import BookingService from "../services/booking.service.js";

const bookingService = new BookingService();

export const createBooking = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { cartId } = req.body;

    if (!user?.userId) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!cartId) {
      return res.status(400).send({
        success: false,
        message: "Cart ID is required",
      });
    }

    const result = await bookingService.processBookingFromCart(
      user.userId,
      cartId,
    );
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).send({
      success: false,
      message: error.message || "failed to create booking",
    });
  }
};
