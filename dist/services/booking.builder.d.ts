import type { IBookingEntry, IBookingComponent } from "../models/booking.model.js";
interface BookingBuildResult {
    entries: IBookingEntry[];
    pricing: {
        subtotal: number;
        taxes: number;
        discount: number;
        grandTotal: number;
    };
}
export declare class BookingBuilder {
    static buildFromCart(cart: any): Promise<BookingBuildResult>;
    static buildServiceBooking(cart: any): Promise<BookingBuildResult>;
    static buildPackageBooking(cart: any): Promise<BookingBuildResult>;
    static mapComponent(component: any, componentType: "DEFAULT" | "ADDON"): IBookingComponent;
}
export {};
//# sourceMappingURL=booking.builder.d.ts.map