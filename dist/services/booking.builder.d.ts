import type { IBookingEntry } from "../models/booking.model.js";
import type { ICart } from "../models/cart.model.js";
interface BookingBuildResult {
    entries: IBookingEntry[];
    pricing: {
        taxes: number;
        grandTotal: number;
    };
}
export declare class BookingBuilder {
    static buildFromCart(cart: ICart): Promise<BookingBuildResult>;
    static buildServiceBooking(cart: ICart): Promise<BookingBuildResult>;
    static buildPackageBooking(cart: ICart): Promise<BookingBuildResult>;
    private static buildComponentSnapshots;
}
export {};
//# sourceMappingURL=booking.builder.d.ts.map