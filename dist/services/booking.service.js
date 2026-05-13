import { Booking } from "../models/booking.model.js";
import { Cart } from "../models/cart.model.js";
import { PricingService } from "./pricing.service.js";
class BookingService {
    pricingService;
    constructor() {
        this.pricingService = new PricingService();
    }
    async processBookingFromCart(userId, cartId) {
        const cart = await Cart.findOne({ _id: cartId, userId });
        if (!cart)
            throw new Error("Cart not found or access denied");
        const bookingData = {
            // customerId: new Types.ObjectId(cart.userId),
            items: {
                // categoryName: snapshotCategory,
                priceAtBooking: 0,
                selectedVariants: [],
            },
            // location: location,
            bookedBy: "CUSTOMER",
            customerDetails: cart.customerDetails,
            scheduledAt: cart.scheduledAt,
            notes: cart.notes,
            status: "Pending",
            paymentStatus: "Pending",
        };
        const newBooking = await Booking.create(bookingData);
        await Cart.findByIdAndUpdate(cartId, {
            activeBookingId: newBooking._id,
        });
        return newBooking;
    }
}
export default BookingService;
//# sourceMappingURL=booking.service.js.map