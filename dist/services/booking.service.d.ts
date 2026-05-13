import { type IBooking } from "../models/booking.model.js";
declare class BookingService {
    private pricingService;
    constructor();
    processBookingFromCart(userId: string, cartId: string): Promise<import("mongoose").Document<unknown, {}, IBooking, {}, import("mongoose").DefaultSchemaOptions> & IBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
export default BookingService;
//# sourceMappingURL=booking.service.d.ts.map