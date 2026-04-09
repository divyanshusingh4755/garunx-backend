import { CartService } from "../services/cart.service.js";
export class CartController {
    cartService;
    constructor() {
        this.cartService = new CartService();
    }
    syncCart = async (req, res) => {
        try {
            const userId = req.user.userId;
            const { items } = req.body;
            const cart = await this.cartService.syncUserCart(userId, items);
            res.status(200).json({ success: true, data: cart });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Sync failed" });
        }
    };
    getCartDetails = async (req, res) => {
        try {
            let itemsToPrice = [];
            const user = req.user;
            console.log("Detected User ID:", user?.userId);
            if (user?.userId) {
                itemsToPrice = await this.cartService.getCartByUserId(user.userId);
                console.log("Items fetched from DB:", itemsToPrice.length);
            }
            else {
                itemsToPrice = req.body.items || [];
                console.log("Items taken from Body:", itemsToPrice.length);
            }
            const data = await this.cartService.getDetailedPriceBreakdown(itemsToPrice);
            res.status(200).json({
                success: true,
                data
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };
    megreCartOnLogin = async (req, res) => {
        try {
            const userId = req.user.userId;
            const { guestItem } = req.body;
            if (!guestItem || guestItem.length === 0) {
                return res.status(200).json({ success: true, message: "No guest item to merge" });
            }
            const mergedCart = await this.cartService.mergeCarts(userId, guestItem);
            res.status(200).json({
                success: true,
                message: "Carts merged successfully",
                data: mergedCart
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    addItem = async (req, res) => {
        try {
            const userId = req.user.userId;
            const newItem = req.body;
            if (!newItem.targetId || !newItem.itemType) {
                return res.status(400).json({
                    success: false,
                    message: "targetId and itemType are required"
                });
            }
            const cart = await this.cartService.addItem(userId, newItem);
            res.status(200).json({
                success: true,
                message: "Item added to cart",
                data: cart
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    removeItem = async (req, res) => {
        try {
            const userId = req.user.userId;
            const { targetId } = req.params;
            const cart = await this.cartService.removeItem(userId, targetId);
            res.status(200).json({
                success: true,
                message: "Item removed from cart",
                data: cart
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    clearCart = async (req, res) => {
        try {
            const userId = req.user.userId;
            await this.cartService.clearCart(userId);
            res.status(200).json({
                success: true,
                message: "Cart cleared successfully"
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    removeVariant = async (req, res) => {
        try {
            const userId = req.user.userId;
            const { targetId, variantId } = req.params;
            const cart = await this.cartService.removeVariant(userId, targetId, variantId);
            res.status(200).json({
                success: true,
                message: "Variant removed from item",
                data: cart
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
//# sourceMappingURL=cart.controllers.js.map