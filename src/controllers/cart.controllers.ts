import type { Request, Response } from "express";
import { CartService } from "../services/cart.service.js";
import type { ICartItem } from "../models/cart.model.js";

export class CartController {
    private cartService: CartService

    constructor() {
        this.cartService = new CartService();
    }

    syncCart = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { items } = req.body;

            if (!Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "Items must be an array"
                });
            }

            const cart = await this.cartService.syncUserCart(user.userId, items);

            res.status(200).json({
                success: true,
                data: cart
            });

        } catch (error: any) {
            console.error("Sync cart error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Sync failed"
            });
        }
    };

    getCartDetails = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            const items = user?.userId
                ? await this.cartService.getCartByUserId(user.userId)
                : Array.isArray(req.body.items)
                    ? req.body.items
                    : [];

            if (!items.length) {
                return res.status(200).json({
                    success: true,
                    data: { items: [], grandTotal: 0, hasChanges: false }
                });
            }

            const data = await this.cartService.getCartDetails(items);

            res.status(200).json({
                success: true,
                data
            });

        } catch (error: any) {
            console.error("Get cart details error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart"
            });
        }
    };

    mergeCartOnLogin = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { guestItems } = req.body;

            if (!Array.isArray(guestItems)) {
                return res.status(400).json({
                    success: false,
                    message: "guestItems must be an array"
                });
            }

            if (guestItems.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No guest items to merge"
                });
            }

            const mergedCart = await this.cartService.mergeCarts(
                user.userId,
                guestItems
            );

            res.status(200).json({
                success: true,
                message: "Carts merged successfully",
                data: mergedCart
            });

        } catch (error: any) {
            console.error("Merge cart error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Merge failed"
            });
        }
    };

    addItem = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const newItem: ICartItem = req.body;

            if (!newItem.targetId || !newItem.itemType) {
                return res.status(400).json({
                    success: false,
                    message: "targetId and itemType are required"
                });
            }

            if (!["SERVICE", "PACKAGE"].includes(newItem.itemType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid itemType"
                });
            }

            if (!Array.isArray(newItem.selectedVariantIds)) {
                return res.status(400).json({
                    success: false,
                    message: "selectedVariantIds must be an array"
                });
            }

            newItem.selectedVariantIds = [
                ...new Set(newItem.selectedVariantIds)
            ];

            const cart = await this.cartService.addItem(
                user.userId,
                newItem
            );

            res.status(201).json({
                success: true,
                message: "Item added to cart",
                data: cart
            });

        } catch (error: any) {
            console.error("Add item error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to add item"
            });
        }
    };

    removeItem = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemKey } = req.params;

            if (!itemKey) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey is required"
                });
            }

            const cart = await this.cartService.removeItem(
                user.userId,
                itemKey as string
            );

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Item removed from cart",
                data: {
                    items: cart.items,
                    totalItems: cart.items.length
                }
            });

        } catch (error: any) {
            console.error("Remove item error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to remove item"
            });
        }
    };

    clearCart = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const cart = await this.cartService.clearCart(user.userId);

            res.status(200).json({
                success: true,
                message: "Cart cleared successfully",
                data: {
                    items: cart?.items || [],
                    totalItems: cart?.items?.length || 0
                }
            });

        } catch (error: any) {
            console.error("Clear cart error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to clear cart"
            });
        }
    };

    removeVariant = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemKey, variantId } = req.params;

            if (!itemKey || !variantId) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey and variantId are required"
                });
            }

            const cart = await this.cartService.removeVariant(
                user.userId,
                itemKey as string,
                variantId as string
            );

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Variant removed from item",
                data: {
                    items: cart.items,
                    totalItems: cart.items.length
                }
            });

        } catch (error: any) {
            console.error("Remove variant error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to remove variant"
            });
        }
    };

    getCartCount = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const count = await this.cartService.getCartCount(user.userId);

            res.status(200).json({
                success: true,
                data: {
                    count
                }
            });

        } catch (error: any) {
            console.error("Get cart count error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart count"
            });
        }
    };

    updateItem = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemKey } = req.params;
            const updatedItem: ICartItem = req.body;

            if (!itemKey) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey is required"
                });
            }

            if (!updatedItem.targetId || !updatedItem.itemType) {
                return res.status(400).json({
                    success: false,
                    message: "targetId and itemType are required"
                });
            }

            if (!["SERVICE", "PACKAGE"].includes(updatedItem.itemType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid itemType"
                });
            }

            if (!Array.isArray(updatedItem.selectedVariantIds)) {
                return res.status(400).json({
                    success: false,
                    message: "selectedVariantIds must be an array"
                });
            }

            updatedItem.selectedVariantIds = [
                ...new Set(updatedItem.selectedVariantIds)
            ];

            const cart = await this.cartService.updateItem(
                user.userId,
                itemKey as string,
                updatedItem
            );

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart or item not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Cart item updated successfully",
                data: {
                    items: cart.items,
                    totalItems: cart.items.length
                }
            });

        } catch (error: any) {
            console.error("Update item error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to update item"
            });
        }
    };

    getCart = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const cart = await this.cartService.getCart(user.userId);

            if (!cart) {
                return res.status(200).json({
                    success: true,
                    data: {
                        items: [],
                        totalItems: 0
                    }
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    items: cart.items,
                    totalItems: cart.items.length
                }
            });

        } catch (error: any) {
            console.error("Get cart error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart"
            });
        }
    };

    getCartItemByTargetId = async (req: Request, res: Response) => {
        try {
            const { targetId } = req.params;

            const result = await this.cartService.getCartItemByTargetId(targetId as string);

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error: any) {
            const status = error.message === "Item not found in cart" ? 404 : 500;

            res.status(status).json({
                success: false,
                message: error.message
            });
        }
    };

    validateCart = async (req: Request, res: Response) => {
        try {
            const { items } = req.body;

            if (!Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "Items must be an array"
                });
            }

            if (!items.length) {
                return res.status(200).json({
                    success: true,
                    data: {
                        isValid: true,
                        invalidItems: []
                    }
                });
            }

            const result = await this.cartService.validateCart(items);

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error: any) {
            console.error("Validate cart error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Cart validation failed"
            });
        }
    };

    prepareCheckout = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;

            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const result = await this.cartService.prepareCheckout(user.userId);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error: any) {
            console.error("Checkout error:", error);

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };
}