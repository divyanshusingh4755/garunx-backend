import { Types } from "mongoose";
import { Booking, type IBooking } from "../models/booking.model.js";
import { Cart } from "../models/cart.model.js";
import { Package } from "../models/package.model.js";
import { Product } from "../models/product.model.js";
import { Service } from "../models/service.model.js";
import { PricingService } from "./pricing.service.js";

class BookingService {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  async processBookingFromCart(userId: string, cartId: string) {
    const cart = await Cart.findOne({ _id: cartId, userId });
    if (!cart) throw new Error("Cart not found or access denied");

    let snapshotName: string;
    let snapshotDescription: string;
    let snapshotImage: string;
    let snapshotCategory: string;
    let location: string;

    if (cart.items.itemType === "SERVICE") {
      const service = await Service.findById(cart.items.targetId);
      if (!service) throw new Error("Service not found");

      snapshotName = service.name;
      snapshotDescription = service.shortDescription;
      snapshotImage = service.thumbnailImage || "";
      snapshotCategory = service.category;
      location = service.locations[0] || "";
    } else {
      const pkg = await Package.findById(cart.items.targetId);
      if (!pkg) throw new Error("Package not found");

      snapshotName = pkg.name;
      snapshotDescription = pkg.description || "";
      snapshotImage = pkg.image || "";
      snapshotCategory = pkg.category;
      location = pkg.locations[0] || "";
    }

    const pricingBreakdown = await this.pricingService.calculate({
      targetId: cart.items.targetId,
      type: cart.items.itemType,
      selectedVariantIds: cart.items.selectedVariantIds,
    });

    const products = await Product.find({
      "variants._id": { $in: cart.items.selectedVariantIds },
    });

    if (!products)
      throw new Error(
        "Could not find product variants associated with this selection",
      );

    const variantForSnapShot = products.flatMap((p) =>
      p.variants
        .filter((v) => cart.items.selectedVariantIds.includes(v._id.toString()))
        .map((v) => ({
          variantId: v._id,
          tier: v.tier,
          price: v.price,
          location: v.location,
        })),
    );

    if (variantForSnapShot.length === 0)
      throw new Error("No valid variants found in product");

    const bookingData: Partial<IBooking> = {
      customerId: new Types.ObjectId(cart.userId),
      items: {
        targetId: new Types.ObjectId(cart.items.targetId),
        productName: snapshotName,
        itemType: cart.items.itemType,
        description: snapshotDescription,
        imageUrl: snapshotImage,
        categoryName: snapshotCategory,
        priceAtBooking: basePrice,
        selectedVariants: variantForSnapShot,
      },
      location: location,
      bookedBy: "CUSTOMER",
      customerDetails: cart.customerDetails,
      scheduledDate: cart.scheduledDate,
      notes: cart.notes,
      pricing: {
        basePrice: pricingBreakdown.subTotal,
        discount: pricingBreakdown.discount,
        finalPrice: pricingBreakdown.total,
        earnings: pricingBreakdown.total * 0.9,
      },
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
