import { Types } from "mongoose";
import type { ICart } from "../models/cart.model.js";
import { type ILineTax, type ITaxSummary } from "../types/tax.types.js";
export interface CartPriceLine {
    amount: number;
    discountAmount: number;
    finalAmount: number;
    taxProfileId?: Types.ObjectId | null;
    taxPriceMode: "EXCLUSIVE" | "INCLUSIVE";
    tax?: ILineTax;
}
export interface CalculatedComponentItem {
    componentId: Types.ObjectId;
    name: string;
    priceBeforeDiscount: number;
    discountAmount: number;
    price: number;
    tax?: ILineTax;
}
export interface CalculatedServiceItem {
    serviceId: Types.ObjectId;
    name: string;
    priceBeforeDiscount: number;
    discountAmount: number;
    price: number;
    tax?: ILineTax;
}
export interface CartTotals {
    basePrice: number;
    addonPrice: number;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    taxSummary: ITaxSummary & {
        supplierStateCode?: string;
        placeOfSupplyStateCode?: string;
    };
    componentLines: Map<string, CartPriceLine>;
    serviceLines: Map<string, CartPriceLine>;
    componentItems: CalculatedComponentItem[];
    serviceItems: CalculatedServiceItem[];
}
export declare class CartPricingEngine {
    private static round;
    private static validateObjectId;
    private static validateMoney;
    private static validateTaxPriceMode;
    private static ensureUniqueIds;
    private static createUniqueMap;
    private static loadTaxProfiles;
    private static emptyTaxSummary;
    private static addLineTaxToSummary;
    private static calculatePricingLine;
    static calculateServiceCart(cart: ICart): Promise<CartTotals>;
    static calculatePackageCart(cart: ICart): Promise<CartTotals>;
    static calculateCartTotals(cart: ICart): Promise<CartTotals>;
}
//# sourceMappingURL=cart-pricing.engine.d.ts.map