import { Booking, type IBooking } from "../models/booking.model.js";
import { Cart } from "../models/cart.model.js";
import { PricingService } from "./pricing.service.js";

class BookingService {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  async processBookingFromCart(userId: string, cartId: string) {
    const cart = await Cart.findOne({ _id: cartId, userId });
    if (!cart) throw new Error("Cart not found or access denied");

    const bookingData: any = {
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
