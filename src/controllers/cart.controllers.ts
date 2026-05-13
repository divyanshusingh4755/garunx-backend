import type { Request, Response } from "express";
import { CartService } from "../services/cart.service.js";

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  createCart = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const cart = await this.cartService.createCart({
        userId: user?.userId,
        ...req.body,
      });

      return res.status(201).json({
        success: true,
        message: "Cart create successfully",
        data: cart,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create cart",
      });
    }
  };

  getUserCarts = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const carts = await this.cartService.getUserCarts(user.userId, req.query);
      return res.status(200).json({
        success: true,
        data: carts,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch carts",
      });
    }
  };

  getCartById = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;
      const cart = await this.cartService.getCartById(
        cartId as string,
        user.userId,
      );
      return res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch cart",
      });
    }
  };

  updateCart = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;
      const cart = await this.cartService.updateCart(
        cartId as string,
        user.userId,
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        data: cart,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update cart",
      });
    }
  };

  deleteCart = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;

      await this.cartService.deleteCart(cartId as string, user.userId);

      return res.status(200).json({
        success: true,
        message: "Cart deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete cart",
      });
    }
  };

  clearCartEntries = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;

      const cart = await this.cartService.clearCartEntries(
        cartId as string,
        user.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Cart entries cleared successfully",
        data: cart,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to clear cart entries",
      });
    }
  };

  addServiceEntry = async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;

      const entry = await this.cartService.addServiceEntry(
        cartId as string,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Service entry added successfully",
        data: entry,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add service entry",
      });
    }
  };

  addPackageEntry = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;

      const entry = await this.cartService.addPackageEntry(
        cartId as string,
        user.userId,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Package entry added successfully",
        data: entry,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add package entry",
      });
    }
  };

  getEntryById = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId, entryId } = req.params;

      const entry = await this.cartService.getEntryById(
        cartId as string,
        entryId as string,
        user.userId,
      );

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch entry",
      });
    }
  };

  updateEntry = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId, entryId } = req.params;

      const entry = await this.cartService.updateEntry(
        cartId as string,
        entryId as string,
        user.userId,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Entry updated successfully",
        data: entry,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update entry",
      });
    }
  };

  removeEntry = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId, entryId } = req.params;

      await this.cartService.removeEntry(
        cartId as string,
        entryId as string,
        user.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Entry removed successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove entry",
      });
    }
  };

  getEntryComponents = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId, entryId } = req.params;

      const components = await this.cartService.getEntryComponents(
        cartId as string,
        entryId as string,
        user.userId,
      );

      return res.status(200).json({
        success: true,
        data: components,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch components",
      });
    }
  };

  updateComponent = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId, componentId } = req.params;

      const component = await this.cartService.updateComponent(
        cartId as string,
        entryId as string,
        componentId as string,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Component updated successfully",
        data: component,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update component",
      });
    }
  };

  updateComponentItems = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId, componentId } = req.params;

      const component = await this.cartService.updateComponentItems(
        cartId as string,
        entryId as string,
        componentId as string,
        req.body.selectedItems,
      );

      return res.status(200).json({
        success: true,
        message: "Component items updated successfully",
        data: component,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update component items",
      });
    }
  };

  addAddonComponent = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId } = req.params;

      const component = await this.cartService.addAddonComponent(
        cartId as string,
        entryId as string,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Addon component added successfully",
        data: component,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add addon component",
      });
    }
  };

  removeAddonComponent = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId, componentId } = req.params;

      await this.cartService.removeAddonComponent(
        cartId as string,
        entryId as string,
        componentId as string,
      );

      return res.status(200).json({
        success: true,
        message: "Addon component removed successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove addon component",
      });
    }
  };

  addAddonService = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId } = req.params;

      const service = await this.cartService.addAddonService(
        cartId as string,
        entryId as string,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Addon service added successfully",
        data: service,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add addon service",
      });
    }
  };

  removeAddonService = async (req: Request, res: Response) => {
    try {
      const { cartId, entryId, serviceId } = req.params;

      await this.cartService.removeAddonService(
        cartId as string,
        entryId as string,
        serviceId as string,
      );

      return res.status(200).json({
        success: true,
        message: "Addon service removed successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove addon service",
      });
    }
  };

  updateIncludedService = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId, entryId, serviceId } = req.params;

      const service = await this.cartService.updateIncludedService(
        cartId as string,
        entryId as string,
        serviceId as string,
        user.userId,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Included service updated successfully",
        data: service,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update included service",
      });
    }
  };

  validateCart = async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;

      const validation = await this.cartService.validateCart(cartId as string);

      return res.status(200).json({
        success: true,
        message: "Cart validated successfully",
        data: validation,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to validate cart",
      });
    }
  };

  recalculateCart = async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params;

      const cart = await this.cartService.recalculateCart(cartId as string);

      return res.status(200).json({
        success: true,
        message: "Cart recalculated successfully",
        data: cart,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to recalculate cart",
      });
    }
  };

  prepareCheckout = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cartId } = req.params;

      const checkout = await this.cartService.prepareCheckout(
        cartId as string,
        user?.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Checkout prepared successfully",
        data: checkout,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to prepare checkout",
      });
    }
  };

  checkoutCart = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const { cartId } = req.params;

      const booking = await this.cartService.checkoutCart(
        cartId as string,
        user?.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Cart checked out successfully",
        data: booking,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to checkout cart",
      });
    }
  };
}
