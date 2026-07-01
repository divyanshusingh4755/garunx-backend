import type { Request, Response } from "express";
import CartService from "../services/cart.service.js";
import { getCartOwner } from "../utils/getCartOwner.js";

export const createServiceCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.createServiceCart(owner, req.body);

    res.status(201).json({
      success: true,
      message: "Service cart created successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to create service cart",
    });
  }
};

export const createPackageCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.createPackageCart(owner, req.body);

    res.status(201).json({
      success: true,
      message: "Package cart created successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to create package cart",
    });
  }
};

export const getUserCarts = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const carts = await CartService.getUserCarts(owner, req.query);

    res.status(200).json({
      success: true,
      carts,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to fetch carts",
    });
  }
};

export const getCartById = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.getCartById(
      owner,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to fetch cart",
    });
  }
};

export const updateSelectedComponents = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateSelectedComponents(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Selected components updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update selected components",
    });
  }
};

export const updateAddonComponents = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateAddonComponents(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Addon components updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update addon components",
    });
  }
};

export const updateAddonServices = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateAddonServices(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Addon services updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update addon services",
    });
  }
};

export const updateSelectedServices = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateSelectedServices(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Addon services updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update addon services",
    });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateSchedule(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update schedule",
    });
  }
};

export const updateCustomerDetails = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const { bookingFor } = req.body;

    if (
      bookingFor &&
      !["MYSELF", "OTHER"].includes(bookingFor)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingFor value",
      });
    }

    if (!req.body.name || !req.body.email || !req.body.phone) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone number is required",
      });
    }

    const cart = await CartService.updateCustomerDetails(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Customer details updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update customer details",
    });
  }
};

export const updateCartNotes = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.updateCartNotes(
      owner,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Cart notes updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update cart notes",
    });
  }
};

export const recalculateCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const cart = await CartService.recalculateCart(
      owner,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      message: "Cart recalculated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to recalculate cart",
    });
  }
};

export const validateCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    const { persist } = req.body;

    if (!persist) {
      return res
        .status(400)
        .json({ success: false, message: "persist missing" });
    }

    const validation = await CartService.validateCart(
      owner,
      req.params.cartId as string,
      Boolean(persist),
    );

    res.status(200).json({
      success: true,
      validation,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to validate cart",
    });
  }
};

export const checkoutCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const checkout = await CartService.checkoutCart(
      userId,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      message: "Cart checked out successfully",
      ...checkout,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to checkout cart",
    });
  }
};

export const deleteCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);
    await CartService.deleteCart(owner, req.params.cartId as string);

    res.status(200).json({
      success: true,
      message: "Cart deleted successfully",
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to delete cart",
    });
  }
};

export const mergeGuestCartToUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const guestId = req.headers["x-guest-id"] as string | undefined;

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message: "x-guest-id header is required",
      });
    }

    await CartService.mergeGuestCartToUser(guestId, userId);

    res.status(200).json({
      success: true,
      message: "Guest carts merged successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to merge guest cart",
    });
  }
};

export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);

    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "couponCode is required",
      });
    }

    const cart = await CartService.applyCoupon(
      owner,
      req.params.cartId as string,
      couponCode,
    );

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeCoupon = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);

    const cart = await CartService.removeCoupon(
      owner,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
      cart,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const reopenCart = async (req: Request, res: Response) => {
  try {
    const owner = getCartOwner(req);

    const cart = await CartService.reopenCart(
      owner,
      req.params.cartId as string,
    );

    return res.status(200).json({
      success: true,
      message: "Cart reopened successfully",
      data: cart,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};