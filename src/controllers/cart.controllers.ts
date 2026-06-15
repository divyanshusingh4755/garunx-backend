import type { Request, Response } from "express";
import CartService from "../services/cart.service.js";

export const createServiceCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.createServiceCart(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Service cart created successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create service cart",
    });
  }
};

export const createPackageCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.createPackageCart(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Package cart created successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create package cart",
    });
  }
};

export const getUserCarts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const carts = await CartService.getUserCarts(userId, req.query);

    res.status(200).json({
      success: true,
      carts,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch carts",
    });
  }
};

export const getCartById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.getCartById(
      userId,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to fetch cart",
    });
  }
};

export const updateSelectedComponents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.updateSelectedComponents(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Selected components updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update selected components",
    });
  }
};

export const updateAddonComponents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.updateAddonComponents(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Addon components updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update addon components",
    });
  }
};

export const updateAddonServices = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.updateAddonServices(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Addon services updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update addon services",
    });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.updateSchedule(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update schedule",
    });
  }
};

export const updateCustomerDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.body.name || !req.body.email || !req.body.phone) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone number is required",
      });
    }

    const cart = await CartService.updateCustomerDetails(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Customer details updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update customer details",
    });
  }
};

export const updateCartNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.updateCartNotes(
      userId,
      req.params.cartId as string,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Cart notes updated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update cart notes",
    });
  }
};

export const recalculateCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await CartService.recalculateCart(
      userId,
      req.params.cartId as string,
    );

    res.status(200).json({
      success: true,
      message: "Cart recalculated successfully",
      cart,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to recalculate cart",
    });
  }
};

export const validateCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { persist } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!persist) {
      return res
        .status(400)
        .json({ success: false, message: "persist missing" });
    }

    const validation = await CartService.validateCart(
      userId,
      req.params.cartId as string,
      Boolean(persist),
    );

    res.status(200).json({
      success: true,
      validation,
    });
  } catch (error: any) {
    res.status(400).json({
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
    res.status(400).json({
      success: false,
      message: error.message || "Failed to checkout cart",
    });
  }
};

export const deleteCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await CartService.deleteCart(userId, req.params.cartId as string);

    res.status(200).json({
      success: true,
      message: "Cart deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete cart",
    });
  }
};
