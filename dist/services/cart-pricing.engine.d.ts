export declare class CartPricingEngine {
    static getServiceBasePrice(serviceId: any, tierId: any, locationId: any): Promise<number>;
    static getPackageBasePrice(packageId: any, tierId: any, locationId: any): Promise<number>;
    static calculateComponentTotal(selectedComponents?: any[]): Promise<any>;
    static calculateAddonServicesTotal(addonServices: any[] | undefined, tierId: any, locationId: any): Promise<any>;
    static calculateCartTotals(cart: any): Promise<{
        basePrice: number;
        addonPrice: number;
        totalAmount: number;
    }>;
}
//# sourceMappingURL=cart-pricing.engine.d.ts.map