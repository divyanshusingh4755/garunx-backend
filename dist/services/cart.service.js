import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { PricingService } from "./pricing.service.js";
export class CartService {
    pricingService;
    constructor() {
        this.pricingService = new PricingService();
    }
    async syncUserCart(userId, items) {
        if (!Array.isArray(items)) {
            throw new Error("Invalid cart items");
        }
        const queryUserId = typeof userId === "string"
            ? new mongoose.Types.ObjectId(userId)
            : userId;
        const cleanedItems = items.map(item => {
            const selectedVariantIds = [...new Set(item.selectedVariantIds)];
            const itemKey = this.generateItemKey({
                ...item,
                selectedVariantIds
            });
            return {
                ...item,
                selectedVariantIds,
                itemKey
            };
        });
        const cart = await Cart.findOneAndUpdate({ userId: queryUserId }, { items: cleanedItems }, { upsert: true, new: true }).lean();
        if (!cart)
            throw new Error("Could not sync cart");
        return cart;
    }
    async getCartByUserId(userId) {
        const cart = await Cart.findOne({ userId }).lean();
        return cart ? cart.items : [];
    }
    async getVariantsByIds(variantIds) {
        if (!variantIds.length)
            return {};
        const variantIdSet = new Set(variantIds);
        const products = await Product.find({ "variants._id": { $in: variantIds } }, { name: 1, variants: 1 }).lean();
        const map = {};
        for (const product of products) {
            for (const variant of product.variants) {
                const id = variant._id.toString();
                if (variantIdSet.has(id) && variant.isActive) {
                    map[id] = {
                        _id: id,
                        tier: variant.tier,
                        price: variant.price,
                        location: variant.location,
                        productId: product._id.toString(),
                        productName: product.name
                    };
                }
            }
        }
        return map;
    }
    async getCartDetails(items) {
        if (!items.length) {
            return { items: [], grandTotal: 0, hasChanges: false };
        }
        const allVariantIds = items.flatMap(i => i.selectedVariantIds);
        const variantMap = await this.getVariantsByIds(allVariantIds);
        const pricingResults = await Promise.allSettled(items.map(item => this.pricingService.calculate({
            targetId: item.targetId,
            type: item.itemType,
            selectedVariantIds: item.selectedVariantIds
        })));
        const validItems = [];
        items.forEach((item, index) => {
            const result = pricingResults[index];
            if (!result) {
                console.error(`Missing pricing result for ${item.targetId}`);
                return;
            }
            if (result.status === "fulfilled") {
                const variants = item.selectedVariantIds
                    .map(id => variantMap[id])
                    .filter((v) => Boolean(v));
                validItems.push({
                    ...item,
                    variants,
                    breakdown: result.value
                });
            }
            else {
                console.error(`Pricing failed for ${item.targetId}:`, result.reason?.message);
            }
        });
        const grandTotal = validItems.reduce((sum, item) => sum + item.breakdown.total, 0);
        return {
            items: validItems,
            grandTotal,
            hasChanges: validItems.length !== items.length
        };
    }
    async mergeCarts(userId, guestItems) {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return await this.syncUserCart(userId, guestItems);
        }
        const itemMap = new Map();
        cart.items.forEach(item => {
            itemMap.set(item.itemKey, item);
        });
        guestItems.forEach(item => {
            const selectedVariantIds = [...new Set(item.selectedVariantIds)];
            const itemKey = this.generateItemKey({
                ...item,
                selectedVariantIds
            });
            const newItem = {
                ...item,
                selectedVariantIds,
                itemKey
            };
            itemMap.set(itemKey, newItem);
        });
        cart.items = Array.from(itemMap.values());
        return await cart.save();
    }
    generateItemKey(item) {
        const sortedVariants = [...item.selectedVariantIds].sort();
        return `${item.itemType}_${item.targetId}_${sortedVariants.join("_")}`;
    }
    async addItem(userId, newItem) {
        const itemKey = this.generateItemKey(newItem);
        const updatedCart = await Cart.findOneAndUpdate({
            userId,
            "items.itemKey": itemKey
        }, {
            $set: {
                "items.$": {
                    ...newItem,
                    itemKey
                }
            }
        }, {
            new: true
        });
        if (updatedCart)
            return updatedCart;
        return await Cart.findOneAndUpdate({ userId }, {
            $push: {
                items: {
                    ...newItem,
                    itemKey
                }
            }
        }, {
            upsert: true,
            new: true
        });
    }
    async removeItem(userId, itemKey) {
        const cart = await Cart.findOneAndUpdate({ userId }, {
            $pull: {
                items: { itemKey }
            }
        }, { new: true });
        if (!cart)
            throw new Error("Cart not found");
        return cart;
    }
    async removeVariant(userId, itemKey, variantId) {
        const cart = await Cart.findOne({ userId });
        if (!cart)
            return null;
        const itemIndex = cart.items.findIndex(item => item.itemKey === itemKey);
        if (itemIndex === -1)
            return cart;
        const item = cart.items[itemIndex];
        if (!item)
            return cart;
        const updatedVariants = item.selectedVariantIds.filter(id => id !== variantId);
        if (updatedVariants.length === 0) {
            cart.items.splice(itemIndex, 1);
        }
        else {
            const newItemKey = this.generateItemKey({
                ...item,
                selectedVariantIds: updatedVariants
            });
            cart.items[itemIndex] = {
                targetId: item.targetId,
                itemType: item.itemType,
                selectedVariantIds: updatedVariants,
                itemKey: newItemKey
            };
        }
        return await cart.save();
    }
    async updateItem(userId, itemKey, updatedItem) {
        const newItemKey = this.generateItemKey(updatedItem);
        const cart = await Cart.findOneAndUpdate({ userId, "items.itemKey": itemKey }, {
            $set: {
                "items.$": {
                    ...updatedItem,
                    itemKey: newItemKey
                }
            }
        }, { new: true });
        return cart;
    }
    async clearCart(userId) {
        return await Cart.findOneAndUpdate({ userId }, {
            $set: { items: [] }
        }, { new: true });
    }
    async getCartItemByTargetId(targetId) {
        const cart = await Cart.findOne({ "items.targetId": targetId }).lean();
        if (!cart) {
            throw new Error("Item not found in any cart");
        }
        const item = cart.items.find(i => i.targetId === targetId);
        if (!item) {
            throw new Error("Item not found in cart");
        }
        const result = await this.getCartDetails([item]);
        return {
            item: result.items[0],
            grandTotal: result.grandTotal,
        };
    }
    async getCart(userId) {
        const cart = await Cart.findOne({ userId }).lean();
        if (!cart || !cart.items.length) {
            return { items: [], grandTotal: 0, hasChanges: false };
        }
        return await this.getCartDetails(cart.items);
    }
    async getCartCount(userId) {
        const cart = await Cart.findOne({ userId }, { items: 1 }).lean();
        return cart?.items.length || 0;
    }
    async validateCart(items) {
        const allVariantIds = items.flatMap(i => i.selectedVariantIds);
        const variantMap = await this.getVariantsByIds(allVariantIds);
        const invalidItems = items.filter(item => item.selectedVariantIds.some(id => !variantMap[id]));
        return {
            isValid: invalidItems.length === 0,
            invalidItems
        };
    }
    async prepareCheckout(userId) {
        const cart = await Cart.findOne({ userId }).lean();
        if (!cart) {
            throw new Error("Cart not found");
        }
        if (!cart.items.length) {
            throw new Error("Cart is empty");
        }
        const details = await this.getCartDetails(cart.items);
        if (!details.items.length) {
            throw new Error("No valid items in cart");
        }
        if (details.hasChanges) {
            return {
                status: "INVALID_CART",
                message: "Some items in your cart have changed. Please review.",
                data: details
            };
        }
        return {
            status: "READY",
            data: {
                items: details.items,
                grandTotal: details.grandTotal
            }
        };
    }
}
//# sourceMappingURL=cart.service.js.map