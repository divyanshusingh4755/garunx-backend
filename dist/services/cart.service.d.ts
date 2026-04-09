import { type ICart, type ICartItem } from "../models/cart.model.js";
export declare class CartService {
    private pricingService;
    constructor();
    syncUserCart(userId: string, items: ICartItem[]): Promise<ICart>;
    getCartByUserId(userId: string): Promise<ICartItem[]>;
    getDetailedPriceBreakdown(items: ICartItem[]): Promise<{
        items: {
            breakdown: import("./pricing.service.js").PriceBreakdown;
            targetId: string;
            itemType: "SERVICE" | "PACKAGE";
            selectedVariantIds: string[];
        }[];
        grandTotal: number;
        hasChanges: boolean;
    }>;
    mergeCarts(userId: string, guestItem: ICartItem[]): Promise<ICart>;
    addItem(userId: string, newItem: ICartItem): Promise<ICart>;
    removeItem(userId: string, targetId: string): Promise<ICart | null>;
    removeVariant(userId: string, targetId: string, variantId: string): Promise<ICart | null>;
    clearCart(userId: string): Promise<void>;
}
//# sourceMappingURL=cart.service.d.ts.map