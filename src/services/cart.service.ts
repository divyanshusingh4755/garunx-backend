import { Cart, type ICart, type ICartItem } from "../models/cart.model.js";
import { PricingService } from "./pricing.service.js";

export class CartService {
    private pricingService: PricingService

    constructor() {
        this.pricingService = new PricingService();
    }

    async syncUserCart(userId: string, items: ICartItem[]): Promise<ICart> {
        const cart = await Cart.findOneAndUpdate(
            { userId },
            { items, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        if (!cart) throw new Error("Could not sync cart");
        return cart;
    }

    async getCartByUserId(userId: string): Promise<ICartItem[]> {
        const cart = await Cart.findOne({ userId }).lean()
        return cart ? cart.items : [];
    }

    async getDetailedPriceBreakdown(items: ICartItem[]) {
        const validItems = [];

        for (const item of items) {
            try {
                const breakdown = await this.pricingService.calculate({
                    targetId: item.targetId,
                    type: item.itemType,
                    selectedVariantIds: item.selectedVariantIds
                });
                validItems.push({
                    ...item,
                    breakdown
                })
            } catch (error: any) {
                console.error(`Pricing failed for ${item.targetId}:`, error.message);
                continue
            }
        }

        const grandTotal = validItems.reduce((sum, item) => sum + item.breakdown.total, 0)

        return {
            items: validItems,
            grandTotal,
            hasChanges: validItems.length !== items.length
        }
    }

    async mergeCarts(userId: string, guestItem: ICartItem[]): Promise<ICart> {
        let cart = await Cart.findOne({ userId })

        if (!cart) {
            return await this.syncUserCart(userId, guestItem)
        }

        const itemMap = new Map<string, ICartItem>();
        cart.items.forEach(item => itemMap.set(item.targetId, item));

        guestItem.forEach(item => itemMap.set(item.targetId, item))

        cart.items = Array.from(itemMap.values())
        cart.updatedAt = new Date()

        return await cart.save()
    }

    async addItem(userId: string, newItem: ICartItem): Promise<ICart> {
        const cart = await Cart.findOneAndUpdate(
            { userId },
            {
                $pull: { items: { targetId: newItem.targetId } }
            },
            { upsert: true, new: true }
        )

        if (!cart) {
            throw new Error("Failed to initialize cart")
        }

        cart.items.push(newItem)
        cart.updatedAt = new Date()
        return await cart.save()

    }

    async removeItem(userId: string, targetId: string): Promise<ICart | null> {
        return await Cart.findOneAndUpdate(
            { userId },
            { $pull: { items: { targetId } } },
            { new: true }
        )
    }

    async removeVariant(userId: string, targetId: string, variantId: string): Promise<ICart | null> {
        const cart = await Cart.findOne({ userId });
        if (!cart) return null;

        const itemIndex = cart.items.findIndex(item => item.targetId === targetId);

        if (itemIndex > -1) {
            const targetItem = cart.items[itemIndex];
            if (!targetItem) return cart;

            const variantIndex = targetItem.selectedVariantIds.indexOf(variantId);

            if (variantIndex > -1) {
                targetItem.selectedVariantIds.splice(variantIndex, 1);

                if (targetItem.selectedVariantIds.length === 0) {
                    cart.items.splice(itemIndex, 1);
                }

                cart.updatedAt = new Date();
                return await cart.save();
            }
        }
        return cart;
    }

    async clearCart(userId: string): Promise<void> {
        await Cart.findOneAndDelete({ userId })
    }

}