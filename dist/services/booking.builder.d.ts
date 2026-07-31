import type { IBookingEntry, IBookingTaxSummary } from "../models/booking.model.js";
import type { ICart } from "../models/cart.model.js";
import type { Types } from "mongoose";
interface BookingBuildResult {
    entries: IBookingEntry[];
    pricing: {
        baseAmount: number;
        addonAmount: number;
        subtotal: number;
        couponId?: Types.ObjectId;
        couponCode?: string;
        discountAmount: number;
        taxSummary: IBookingTaxSummary;
        grandTotal: number;
    };
}
export declare class BookingBuilder {
    private static toPlainCart;
    private static validateCartType;
    private static buildTaxSummary;
    private static buildMainPricing;
    static buildFromCart(cart: ICart): Promise<BookingBuildResult>;
    static buildServiceBooking(cart: ICart): Promise<BookingBuildResult>;
    static buildPackageBooking(cart: ICart): Promise<BookingBuildResult>;
    private static buildPackageServiceConfiguration;
    private static buildTaxSummaryFromLine;
    private static buildComponentSnapshots;
}
export {};
//# sourceMappingURL=booking.builder.d.ts.map