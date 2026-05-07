import { type ICart, type ICartItem } from "../models/cart.model.js";
type VariantDetails = {
    _id: string;
    tier: string;
    price: number;
    location: string;
    productId: string;
    productName: string;
    description: string;
};
export declare class CartService {
    private pricingService;
    constructor();
    syncUserCart(userId: string, item: ICartItem, cartId?: string): Promise<ICart>;
    updateCustomerDetails(cartId: string, details: Partial<ICart["customerDetails"]>): Promise<ICart | null>;
    getCartByUserId(userId: string): Promise<ICart[]>;
    getVariantsByIds(variantIds: string[]): Promise<Record<string, VariantDetails>>;
    getCartDetails(cart: any): Promise<{
        _id: any;
        userId: any;
        customerDetails: any;
        activeBookingId: any;
        items: any;
        isValid: boolean;
        updatedAt: any;
        grandTotal: number;
    }>;
    getTargetMetadata(items: ICartItem[]): Promise<Record<string, any>>;
    mergeCarts(userId: string, guestCartIds: string[]): Promise<any>;
    generateItemKey(item: ICartItem): string;
    addItem(userId: string | null, newItem: ICartItem): Promise<any>;
    removeItem(userId: string, itemKey: string): Promise<boolean>;
    removeVariant(userId: string, itemKey: string, variantId: string): Promise<any | null>;
    updateItem(userId: string, oldItemKey: string, updatedItem: ICartItem): Promise<any>;
    clearCart(userId: string): Promise<void>;
    getCartItemByTargetId(userId: string, targetId: string): Promise<{
        _id: any;
        userId: any;
        customerDetails: any;
        activeBookingId: any;
        items: any;
        isValid: boolean;
        updatedAt: any;
        grandTotal: number;
    }>;
    getCart(userId: string): Promise<{
        carts: {
            _id: any;
            userId: any;
            customerDetails: any;
            activeBookingId: any;
            items: any;
            isValid: boolean;
            updatedAt: any;
            grandTotal: number;
        }[];
        grandTotal: number;
    }>;
    getCartCount(userId: string): Promise<number>;
    validateCart(carts: any[]): Promise<{
        isValid: boolean;
        invalidItems: {
            _id: any;
            userId: any;
            customerDetails: any;
            activeBookingId: any;
            items: any;
            isValid: boolean;
            updatedAt: any;
            grandTotal: number;
        }[];
    }>;
    prepareCheckout(cartId: string, userId: string): Promise<{
        status: string;
        data: {
            cartId: any;
            item: any;
            grandTotal: number;
        };
    }>;
}
export {};
//# sourceMappingURL=cart.service.d.ts.map