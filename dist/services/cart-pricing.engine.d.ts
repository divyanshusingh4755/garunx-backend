import { Types } from "mongoose";
import { type ILineTax, type ITaxSummary } from "../types/tax.types.js";
export interface CartPriceLine {
    amount: number;
    discountAmount: number;
    finalAmount: number;
    taxProfileId?: Types.ObjectId | null;
    taxPriceMode: "EXCLUSIVE" | "INCLUSIVE";
    tax?: ILineTax;
}
export interface CartTotals {
    basePrice: number;
    addonPrice: number;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    taxSummary: ITaxSummary & {
        supplierStateCode: string | undefined;
        placeOfSupplyStateCode: string | undefined;
    };
    componentLines: Map<string, CartPriceLine>;
    serviceLines: Map<string, CartPriceLine>;
}
export declare class CartPricingEngine {
    private static loadTaxProfiles;
    private static round;
    private static emptyTaxSummary;
    private static addLineTaxToSummary;
    private static calculatePricingLine;
    static calculateServiceCart(cart: any): Promise<CartTotals>;
    static calculatePackageCart(cart: any): Promise<CartTotals>;
    static calculateCartTotals(cart: any): Promise<CartTotals>;
}
//# sourceMappingURL=cart-pricing.engine.d.ts.map