import { CartService } from "../services/cart.service.js";
import mongoose from "mongoose";
export class CartController {
    cartService;
    constructor() {
        this.cartService = new CartService();
    }
    syncCart = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { item, cartId } = req.body;
            if (!item || typeof item !== "object") {
                return res.status(400).json({
                    success: false,
                    message: "A valid item object is required",
                });
            }
            const cart = await this.cartService.syncUserCart(user.userId, item, cartId);
            res.status(200).json({
                success: true,
                data: cart,
            });
        }
        catch (error) {
            console.error("Sync cart error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Sync failed",
            });
        }
    };
    getCartDetails = async (req, res) => {
        try {
            const user = req.user;
            let rawCarts = [];
            if (user?.userId) {
                rawCarts = await this.cartService.getCartByUserId(user.userId);
            }
            else {
                rawCarts = req.body.Items.map((item) => ({
                    items: item,
                    customerDetails: {},
                    _id: new mongoose.Types.ObjectId(),
                }));
            }
            if (!rawCarts.length) {
                return res.status(200).json({
                    success: true,
                    data: { carts: [], grandTotal: 0 },
                });
            }
            const enrichedCarts = await Promise.all(rawCarts.map((cart) => this.cartService.getCartDetails(cart)));
            const grandTotal = enrichedCarts.reduce((acc, cart) => acc + (cart.grandTotal || 0), 0);
            res.status(200).json({
                success: true,
                data: {
                    carts: enrichedCarts,
                    grandTotal,
                },
            });
        }
        catch (error) {
            console.error("Get cart details error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart",
            });
        }
    };
    mergeCartOnLogin = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { guestCartIds } = req.body;
            if (!Array.isArray(guestCartIds)) {
                return res.status(400).json({
                    success: false,
                    message: "guestCartIds must be an array",
                });
            }
            const mergedCartData = await this.cartService.mergeCarts(user.userId, guestCartIds);
            res.status(200).json({
                success: true,
                message: "Carts merged successfully",
                data: mergedCartData,
            });
        }
        catch (error) {
            console.error("Merge cart error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Merge failed",
            });
        }
    };
    addItem = async (req, res) => {
        try {
            const user = req.user;
            const userId = user?.userId || null;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const newItem = req.body;
            if (!newItem.targetId || !newItem.itemType) {
                return res.status(400).json({
                    success: false,
                    message: "targetId and itemType are required",
                });
            }
            newItem.selectedVariantIds = Array.isArray(newItem.selectedVariantIds)
                ? [...new Set(newItem.selectedVariantIds)]
                : [];
            const data = await this.cartService.addItem(userId, newItem);
            res.status(201).json({
                success: true,
                message: "Item added to cart",
                data,
            });
        }
        catch (error) {
            console.error("Add item error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to add item",
            });
        }
    };
    removeItem = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { itemKey } = req.params;
            if (!itemKey) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey is required",
                });
            }
            const isDeleted = await this.cartService.removeItem(user.userId, itemKey);
            if (!isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found in your cart",
                });
            }
            const updatedFullCart = await this.cartService.getCart(user.userId);
            res.status(200).json({
                success: true,
                message: "Item removed from cart",
                data: updatedFullCart,
            });
        }
        catch (error) {
            console.error("Remove item error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to remove item",
            });
        }
    };
    clearCart = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            await this.cartService.clearCart(user.userId);
            res.status(200).json({
                success: true,
                message: "Cart cleared successfully",
                data: {
                    carts: [],
                    grandTotal: 0,
                },
            });
        }
        catch (error) {
            console.error("Clear cart error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to clear cart",
            });
        }
    };
    removeVariant = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { itemKey, variantId } = req.params;
            if (!itemKey || !variantId) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey and variantId are required",
                });
            }
            const result = await this.cartService.removeVariant(user.userId, itemKey, variantId);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found",
                });
            }
            if (result.deleted) {
                const fullCart = await this.cartService.getCart(user.userId);
                return res.status(200).json({
                    success: true,
                    message: "Item removed (no variants left)",
                    data: fullCart,
                });
            }
            res.status(200).json({
                success: true,
                message: "Variant removed",
                data: result,
            });
        }
        catch (error) {
            console.error("Remove variant error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to remove variant",
            });
        }
    };
    getCartCount = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const count = await this.cartService.getCartCount(user.userId);
            res.status(200).json({
                success: true,
                data: {
                    count,
                },
            });
        }
        catch (error) {
            console.error("Get cart count error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart count",
            });
        }
    };
    updateItem = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { itemKey } = req.params;
            const updatedItem = req.body;
            if (!itemKey) {
                return res.status(400).json({
                    success: false,
                    message: "itemKey is required",
                });
            }
            if (!updatedItem.targetId || !updatedItem.itemType) {
                return res.status(400).json({
                    success: false,
                    message: "targetId and itemType are required",
                });
            }
            if (!["SERVICE", "PACKAGE"].includes(updatedItem.itemType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid itemType",
                });
            }
            if (!Array.isArray(updatedItem.selectedVariantIds)) {
                return res.status(400).json({
                    success: false,
                    message: "selectedVariantIds must be an array",
                });
            }
            updatedItem.selectedVariantIds = [
                ...new Set(updatedItem.selectedVariantIds),
            ];
            const cart = await this.cartService.updateItem(user.userId, itemKey, updatedItem);
            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart or item not found",
                });
            }
            res.status(200).json({
                success: true,
                message: "Cart item updated successfully",
                data: cart,
            });
        }
        catch (error) {
            console.error("Update item error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to update item",
            });
        }
    };
    getCart = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const cartData = await this.cartService.getCart(user.userId);
            if (!cartData) {
                return res.status(200).json({
                    success: true,
                    data: {
                        items: [],
                        grandTotal: 0,
                        totalItems: 0,
                    },
                });
            }
            res.status(200).json({
                success: true,
                data: {
                    items: cartData.carts,
                    grandTotal: cartData.grandTotal,
                    totalItems: cartData.carts?.length,
                },
            });
        }
        catch (error) {
            console.error("Get cart error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch cart",
            });
        }
    };
    getCartItemByTargetId = async (req, res) => {
        try {
            const user = req.user;
            const { targetId } = req.params;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await this.cartService.getCartItemByTargetId(user.userId, targetId);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            const status = error.message === "Item not found in cart" ? 404 : 500;
            res.status(status).json({
                success: false,
                message: error.message,
            });
        }
    };
    validateCart = async (req, res) => {
        try {
            const { items } = req.body;
            if (!Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "Items must be an array",
                });
            }
            if (!items.length) {
                return res.status(200).json({
                    success: true,
                    data: {
                        isValid: true,
                        invalidItems: [],
                    },
                });
            }
            const result = await this.cartService.validateCart(items);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error("Validate cart error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Cart validation failed",
            });
        }
    };
    prepareCheckout = async (req, res) => {
        try {
            const user = req.user;
            if (!user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const { cartId } = req.params;
            if (!cartId) {
                return res.status(400).json({
                    success: false,
                    message: "CartId is required",
                });
            }
            const result = await this.cartService.prepareCheckout(cartId, user.userId);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            console.error("Checkout error:", error);
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    };
    updateCustomerDetails = async (req, res) => {
        try {
            const user = req.user;
            const { cartId } = req.params;
            const { customerDetails } = req.body;
            if (!user?.userId) {
                return res
                    .status(401)
                    .json({ success: false, message: "Unauthorized" });
            }
            if (!cartId || !customerDetails) {
                return res.status(400).json({
                    success: false,
                    message: "cartId and customerDetails are required",
                });
            }
            const updatedCart = await this.cartService.updateCustomerDetails(cartId, customerDetails);
            res.status(200).json({
                success: true,
                message: "Customer details updated",
                data: updatedCart,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
//# sourceMappingURL=cart.controllers.js.map