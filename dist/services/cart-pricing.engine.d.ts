export declare class CartPricingEngine {
    static calculateServiceCart(cart: any): Promise<{
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
    }>;
    static calculatePackageCart(cart: any): Promise<{
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
    }>;
    static calculateCartTotals(cart: any): Promise<{
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
    }>;
}
//# sourceMappingURL=cart-pricing.engine.d.ts.map