import mongoose from "mongoose";
import { type ICart, type ICartItem } from "../models/cart.model.js";
interface IPriceBreakdown {
    total: number;
}
type VariantDetails = {
    _id: string;
    tier: string;
    price: number;
    location: string;
    productId: string;
    productName: string;
};
type EnrichedCartItem = ICartItem & {
    variants: VariantDetails[];
    breakdown: IPriceBreakdown;
};
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
        productId: string;
        productName: string;
    }>>;
    getCartDetails(items: ICartItem[]): Promise<{
        items: EnrichedCartItem[];
        grandTotal: number;
        hasChanges: boolean;
    }>;
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
    getCartItemByTargetId(targetId: string): Promise<{
        item: EnrichedCartItem | undefined;
        grandTotal: number;
    }>;
    getCart(userId: string): Promise<{
        items: EnrichedCartItem[];
        grandTotal: number;
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
            items: EnrichedCartItem[];
            grandTotal: number;
            hasChanges: boolean;
        };
    } | {
        status: string;
        data: {
            items: EnrichedCartItem[];
            grandTotal: number;
        };
        message?: never;
    }>;
}
export {};
//# sourceMappingURL=cart.service.d.ts.map