import mongoose from "mongoose";
import { type ICart, type ICartItem } from "../models/cart.model.js";
export declare class CartService {
    private pricingService;
    constructor();
    syncUserCart(userId: string, items: ICartItem[]): Promise<ICart>;
    getCartByUserId(userId: string): Promise<ICartItem[]>;
    getVariantsByIds(variantIds: string[]): Promise<Record<string, {
        _id: string;
        tier: string;
        price: number;
        location: string;
        description: string;
        productId: string;
        productName: string;
    }>>;
    getCartDetails(items: ICartItem[]): Promise<{
        items: any[];
        grandTotal: any;
        hasChanges: boolean;
    }>;
    getTargetMetadata(items: ICartItem[]): Promise<Record<string, any>>;
    mergeCarts(userId: string, guestItems: ICartItem[]): Promise<ICart>;
    generateItemKey(item: ICartItem): string;
    addItem(userId: string, newItem: ICartItem): Promise<ICart>;
    removeItem(userId: string, itemKey: string): Promise<ICart>;
    removeVariant(userId: string, itemKey: string, variantId: string): Promise<ICart | null>;
    updateItem(userId: string, itemKey: string, updatedItem: ICartItem): Promise<(mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    clearCart(userId: string): Promise<ICart | null>;
    getCartItemByTargetId(userId: string, targetId: string): Promise<{
        item: any;
        grandTotal: any;
    }>;
    getCart(userId: string): Promise<{
        items: any[];
        grandTotal: any;
        hasChanges: boolean;
    }>;
    getCartCount(userId: string): Promise<number>;
    validateCart(items: ICartItem[]): Promise<{
        isValid: boolean;
        invalidItems: ICartItem[];
    }>;
    prepareCheckout(userId: string): Promise<{
        status: string;
        message: string;
        data: {
            items: any[];
            grandTotal: any;
            hasChanges: boolean;
        };
    } | {
        status: string;
        data: {
            items: any[];
            grandTotal: any;
        };
        message?: never;
    }>;
}
//# sourceMappingURL=cart.service.d.ts.map