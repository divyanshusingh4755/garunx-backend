import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Component } from "../models/component.model.js";
import { PricingService } from "./pricing.service.js";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
export class CartService {
    pricingService;
    constructor() {
        this.pricingService = new PricingService();
    }
    async syncUserCart(userId, item, cartId) {
        const selectedVariantIds = [...new Set(item.selectedVariantIds)];
        const itemKey = this.generateItemKey({ ...item, selectedVariantIds });
        const queryUserId = new mongoose.Types.ObjectId(userId);
        const cartData = {
            userId: queryUserId,
            items: { ...item, selectedVariantIds, itemKey },
        };
        let cart;
        if (cartId) {
            cart = await Cart.findByIdAndUpdate(cartId, { $set: cartData }, { new: true }).lean();
        }
        else {
            const existingCart = await Cart.findOne({
                userId: queryUserId,
                "items.itemKey": itemKey,
            });
            if (existingCart) {
                cart = existingCart;
            }
            else {
                cart = await Cart.create(cartData);
            }
        }
        if (!cart)
            throw new Error("Could not sync cart");
        return cart;
    }
    async updateCustomerDetails(cartId, details) {
        return await Cart.findByIdAndUpdate(cartId, { $set: { customerDetails: details } }, { new: true }).lean();
    }
    async getCartByUserId(userId) {
        return await Cart.find({ userId }).sort({ updatedAt: -1 }).lean();
    }
    async getVariantsByIds(variantIds) {
        if (!variantIds.length)
            return {};
        const variantIdSet = new Set(variantIds);
        const products = await Component.find({ "variants._id": { $in: variantIds } }, { name: 1, variants: 1 }).lean();
        const map = {};
        return map;
    }
    async getCartDetails(cart) {
        const cartItem = cart.items;
        const selectedVariantIds = cartItem?.selectedVariantIds || [];
        const [variantMap, targetData] = await Promise.all([
            this.getVariantsByIds(selectedVariantIds),
            this.getTargetMetadata([cartItem]),
        ]);
        let pricingResult;
        try {
            pricingResult = await this.pricingService.calculate({
                targetId: cartItem.targetId,
                type: cartItem.itemType,
                selectedVariantIds: selectedVariantIds,
            });
        }
        catch (error) {
            pricingResult = null;
        }
        const metadata = targetData[cartItem.targetId.toString()] || {};
        const variants = selectedVariantIds
            .map((id) => variantMap[id])
            .filter(Boolean);
        const isStillValid = !!pricingResult &&
            !!metadata.name &&
            variants.length === selectedVariantIds.length;
        return {
            _id: cart._id,
            userId: cart.userId || null,
            customerDetails: cart.customerDetails || {},
            activeBookingId: cart.activeBookingId,
            items: {
                ...cartItem,
                name: metadata.name || "Unknown Service",
                image: metadata.image || null,
                variants,
                breakdown: pricingResult,
            },
            isValid: !!isStillValid,
            updatedAt: cart.updatedAt || new Date(),
            grandTotal: pricingResult?.total || 0,
        };
    }
    async getTargetMetadata(items) {
        const packageIds = items
            .filter((i) => i.itemType === "PACKAGE")
            .map((i) => i.targetId);
        const serviceIds = items
            .filter((i) => i.itemType === "SERVICE")
            .map((i) => i.targetId);
        const [packages, services] = await Promise.all([
            Package.find({ _id: { $in: packageIds } }, { name: 1, description: 1, image: 1 }).lean(),
            Service.find({ _id: { $in: serviceIds } }, { name: 1, shortDescription: 1, thumbnailImage: 1 }).lean(),
        ]);
        const metadataMap = {};
        packages.forEach((p) => {
            metadataMap[p._id.toString()] = {
                name: p.name,
                description: p.description,
                image: p.image,
            };
        });
        services.forEach((s) => {
            metadataMap[s._id.toString()] = {
                name: s.name,
                description: s.shortDescription,
                image: s.thumbnailImage,
            };
        });
        return metadataMap;
    }
    async mergeCarts(userId, guestCartIds) {
        if (!guestCartIds.length)
            return await this.getCart(userId);
        const queryUserId = new mongoose.Types.ObjectId(userId);
        await Cart.updateMany({
            _id: { $in: guestCartIds },
            userId: { $exists: false },
        }, { $set: { userId: queryUserId } });
        const allCarts = await Cart.find({ userId: queryUserId }).sort({
            updatedAt: -1,
        });
        const seenItemkeys = new Set();
        const idsToDelete = [];
        for (const cart of allCarts) {
            const key = cart.items.itemKey;
            if (seenItemkeys.has(key)) {
                idsToDelete.push(cart._id);
            }
            else {
                seenItemkeys.add(key);
            }
        }
        if (idsToDelete.length > 0) {
            await Cart.deleteMany({ _id: { $in: idsToDelete } });
        }
    }
    generateItemKey(item) {
        const sortedVariants = [...item.selectedVariantIds].sort();
        return `${item.itemType}_${item.targetId}_${sortedVariants.join("_")}`;
    }
    async addItem(userId, newItem) {
        const itemKey = this.generateItemKey(newItem);
        const queryUserId = userId ? new mongoose.Types.ObjectId(userId) : null;
        if (queryUserId) {
            const existingCart = await Cart.findOne({
                userId: queryUserId,
                "items.itemKey": itemKey,
            });
            if (existingCart) {
                return await this.getCartDetails(existingCart);
            }
        }
        const newCart = await Cart.create({
            userId: queryUserId,
            items: {
                ...newItem,
                itemKey,
            },
        });
        return await this.getCartDetails(newCart);
    }
    async removeItem(userId, itemKey) {
        const queryUserId = new mongoose.Types.ObjectId(userId);
        const deletedDoc = await Cart.findOneAndDelete({
            userId,
            "items.itemKey": itemKey,
        });
        return !!deletedDoc;
    }
    async removeVariant(userId, itemKey, variantId) {
        const queryUserId = new mongoose.Types.ObjectId(userId);
        const currentCart = await Cart.findOne({
            userId: queryUserId,
            "items.itemKey": itemKey,
        });
        if (!currentCart)
            return null;
        const updatedVariants = currentCart.items.selectedVariantIds.filter((id) => id !== variantId);
        if (updatedVariants.length === 0) {
            await Cart.findByIdAndDelete(currentCart._id);
            return { deleted: true };
        }
        const newItemKey = this.generateItemKey({
            targetId: currentCart.items.targetId,
            itemType: currentCart.items.itemType,
            selectedVariantIds: updatedVariants,
            itemKey: "",
        });
        const existingDuplicate = await Cart.findOne({
            userId: queryUserId,
            "items.itemKey": newItemKey,
            _id: { $ne: currentCart._id },
        });
        if (existingDuplicate) {
            await Cart.findByIdAndDelete(currentCart._id);
            return await this.getCartDetails(existingDuplicate);
        }
        currentCart.items.selectedVariantIds = updatedVariants;
        currentCart.items.itemKey = newItemKey;
        const savedCart = await currentCart.save();
        return await this.getCartDetails(savedCart);
    }
    async updateItem(userId, oldItemKey, updatedItem) {
        const queryuserId = new mongoose.Types.ObjectId(userId);
        const newItemKey = this.generateItemKey(updatedItem);
        const currentCart = await Cart.findOne({
            userId: queryuserId,
            "items.itemKey": oldItemKey,
        });
        if (!currentCart)
            return null;
        if (newItemKey !== oldItemKey) {
            const existingDuplicate = await Cart.findOne({
                userId: queryuserId,
                "items.itemKey": newItemKey,
                _id: { $ne: currentCart._id },
            });
            if (existingDuplicate) {
                await Cart.findByIdAndDelete(currentCart._id);
                return await this.getCartDetails(existingDuplicate);
            }
        }
        currentCart.items = {
            ...updatedItem,
            itemKey: newItemKey,
        };
        const savedCart = await currentCart.save();
        return await this.getCartDetails(savedCart);
    }
    async clearCart(userId) {
        const queryUserId = new mongoose.Types.ObjectId(userId);
        await Cart.deleteMany({ userId: queryUserId });
    }
    async getCartItemByTargetId(userId, targetId) {
        const cart = await Cart.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            "items.targetId": targetId,
        }).lean();
        if (!cart) {
            throw new Error("Item not found in any cart");
        }
        return await this.getCartDetails(cart);
    }
    async getCart(userId) {
        const carts = await Cart.find({ userId }).sort({ createdAt: -1 }).lean();
        if (!carts || carts.length === 0) {
            return { carts: [], grandTotal: 0 };
        }
        const enrichedCarts = await Promise.all(carts.map((cart) => this.getCartDetails(cart)));
        const grandTotal = enrichedCarts.reduce((sum, cart) => sum + (cart.grandTotal || 0), 0);
        return {
            carts: enrichedCarts,
            grandTotal,
        };
    }
    async getCartCount(userId) {
        const queryUserId = new mongoose.Types.ObjectId(userId);
        return await Cart.countDocuments({ userId: queryUserId });
    }
    async validateCart(carts) {
        const enrichedResults = await Promise.all(carts.map((cart) => this.getCartDetails(cart)));
        const invalidItems = enrichedResults.filter((result) => !result.isValid);
        return {
            isValid: invalidItems.length === 0,
            invalidItems,
        };
    }
    async prepareCheckout(cartId, userId) {
        const queryUserId = new mongoose.Types.ObjectId(userId);
        const cart = await Cart.findOne({
            _id: cartId,
            userId: queryUserId,
        }).lean();
        if (!cart) {
            throw new Error("Specific cart document not found");
        }
        const details = await this.getCartDetails(cart);
        if (!details.isValid) {
            throw new Error("Item is not longer available in cart or price has changes");
        }
        return {
            status: "READY",
            data: {
                cartId: details._id,
                item: details.items,
                grandTotal: details.grandTotal,
            },
        };
    }
}
//# sourceMappingURL=cart.service.js.map