import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { CartPricingEngine } from "./cart-pricing.engine.js";
import { BookingBuilder } from "./booking.builder.js";
import { Booking, type IBooking } from "../models/booking.model.js";

class CartService {
  static async createServiceCart(userId: string, payload: any) {
    const { serviceId, tierId, locationId } = payload;

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      throw new Error("Service not found or inactive");
    }

    const isValidTier = service.tiers.some(
      (t) => t.tierId.toString() === tierId,
    );
    const isValidLocation = service.locations.some(
      (l) => l.locationId.toString() === locationId,
    );

    if (!isValidTier) throw new Error("Invalid tier");
    if (!isValidLocation) throw new Error("Invalid location");

    const cart = await Cart.create({
      userId,
      serviceId: service._id,
      name: service.name,
      thumbnailImage: service.thumbnailImage ?? "",
      categoryId: service.categoryId,
      tierId,
      tierName:
        service.tiers.find((t) => t.tierId.toString() === tierId)?.name || "",
      locationId,
      locationName:
        service.locations.find((l) => l.locationId.toString() === locationId)
          ?.name || "",
      selectedComponents: [],
      addonComponents: [],
      addonServices: [],
      basePrice: 0,
      addonPrice: 0,
      totalAmount: 0,
      status: "ACTIVE",
    });

    const totals = await CartPricingEngine.calculateCartTotals(cart);

    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;

    await cart.save();
    return cart;
  }

  static async createPackageCart(userId: string, payload: any) {
    const { packageId, tierId, locationId } = payload;

    const pkg = await Package.findById(packageId);
    if (!pkg?.isActive) throw new Error("Package not found");

    const isValidTier = pkg.tiers.some((t) => t.tierId.toString() === tierId);
    const isValidLocation = pkg.locations.some(
      (l) => l.locationId.toString() === locationId,
    );

    if (!isValidTier) throw new Error("Invalid tier");
    if (!isValidLocation) throw new Error("Invalid location");

    const cart = await Cart.create({
      userId,
      packageId,
      name: pkg.name,
      thumbnailImage: pkg.thumbnailImage ?? "",
      categoryId: pkg.categoryId,
      tierId,
      tierName:
        pkg.tiers.find((t) => t.tierId.toString() === tierId)?.name || "",
      locationId,
      locationName:
        pkg.locations.find((l) => l.locationId.toString() === locationId)
          ?.name || "",
      addonServices: [],
      basePrice: 0,
      addonPrice: 0,
      totalAmount: 0,
      status: "ACTIVE",
    });

    const totals = await CartPricingEngine.calculateCartTotals(cart);

    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;

    await cart.save();
    return cart;
  }

  static async getUserCarts(userId: string) {
    if (!userId) {
      throw new Error("Token missing");
    }

    const carts = await Cart.find({
      userId: userId,
      status: { $ne: "EXPIRED" },
    })
      .sort({ updatedAt: -1 })
      .select(
        "serviceId packageId name thumbnailImage tierName locationName status totalAmount updatedAt scheduledDate scheduledTime",
      );

    return carts;
  }

  static async getCartById(userId: string, cartId: string) {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    }).lean();

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.serviceId) {
      const service = await Service.findById(cart.serviceId).lean();

      if (!service) {
        throw new Error("Service not found");
      }

      const componentIds =
        service.subServiceComponents
          ?.map((c: any) => c.componentId)
          ?.filter(Boolean) || [];

      const componentMap = new Map(
        (
          await Component.find({
            _id: { $in: componentIds },
          }).lean()
        ).map((c: any) => [c._id.toString(), c]),
      );

      const itemIds =
        service.subServiceComponents
          ?.flatMap((c: any) => c.items?.map((i: any) => i.itemId))
          ?.filter(Boolean) || [];

      const itemMap = new Map(
        (
          await ComponentItem.find({
            _id: { $in: itemIds },
          }).lean()
        ).map((i: any) => [i._id.toString(), i]),
      );

      const hydratedSelectedComponents = (cart.selectedComponents || []).map(
        (comp: any) => {
          return {
            ...comp,
            component: componentMap.get(comp.componentId.toString()),
            items: comp.items.map((item: any) => ({
              ...item,
              itemDetails: itemMap.get(item.itemId.toString()),
            })),
          };
        },
      );

      const hydratedAddonComponents = (cart.addonComponents || []).map(
        (comp: any) => ({
          ...comp,
          items: comp.items.map((item: any) => ({
            ...item,
            itemDetails: itemMap.get(item.itemId.toString()),
          })),
        }),
      );

      return {
        ...cart,
        service,
        selectedComponents: hydratedSelectedComponents,
        addonComponents: hydratedAddonComponents,
      };
    }

    if (cart.packageId) {
      const pkg = await Package.findById(cart.packageId).lean();

      if (!pkg) {
        throw new Error("Package not found");
      }

      return {
        ...cart,
        package: pkg,
        addonServices: cart.addonServices || [],
      };
    }

    throw new Error("Invalid cart type");
  }

  static async updateSelectedComponents(
    userId: string,
    cartId: string,
    payload: any,
  ) {
    const { selectedComponents } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.serviceId) {
      throw new Error("This operation is only allowed for service carts");
    }

    const serviceComponents = await ServiceComponent.find({
      serviceId: cart.serviceId,
      tierId: cart.tierId,
    }).lean();

    const componentMap = new Map(
      serviceComponents.map((c) => [c.componentId.toString(), c]),
    );

    const missingRequired = serviceComponents
      .filter((c) => c.isRequired)
      .filter((c) => {
        return !selectedComponents?.some(
          (sc: any) => sc.componentId === c.componentId.toString(),
        );
      });

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required components: ${missingRequired
          .map((c) => c.name)
          .join(", ")}`,
      );
    }

    cart.selectedComponents = selectedComponents || [];
    const totals = await CartPricingEngine.calculateCartTotals(cart);

    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;

    await cart.save();
    return cart;
  }

  static async updateAddonComponents(
    userId: string,
    cartId: string,
    payload: any,
  ) {
    const { addonComponents } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.serviceId) {
      throw new Error("This operation is only allowed for service carts");
    }

    const serviceComponents = await ServiceComponent.find({
      serviceId: cart.serviceId,
      tierId: cart.tierId,
    }).lean();

    const componentMap = new Map(
      serviceComponents.map((c) => [c.componentId.toString(), c]),
    );

    const updatedAddonComponents = [];

    for (const ac of addonComponents || []) {
      const component = componentMap.get(ac.componentId);

      if (!component) {
        throw new Error("Invalid addon component for this service");
      }

      const items = await ComponentItem.find({
        _id: { $in: ac.items },
      }).lean();

      if (items.length !== ac.items.length) {
        throw new Error("Invalid addon component items selected");
      }

      const totalPrice = items.reduce((sum, i: any) => sum + (i.price || 0), 0);

      updatedAddonComponents.push({
        componentId: ac.componentId,
        name: component.name,
        items: items.map((i) => ({
          itemId: i._id,
          name: i.name,
          price: i.price ?? 0,
        })),
        totalPrice,
      });
    }

    cart.addonComponents = updatedAddonComponents;
    const totals = await CartPricingEngine.calculateCartTotals(cart);
    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;
    await cart.save();
    return cart;
  }

  static async updateAddonServices(
    userId: string,
    cartId: string,
    payload: any,
  ) {
    const { serviceIds } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    }).lean();

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.packageId) {
      throw new Error("This operation is only allowed for package carts");
    }

    if (!serviceIds || !Array.isArray(serviceIds)) {
      throw new Error("serviceIds must be an array");
    }

    const services = await Service.find({
      _id: { $in: serviceIds },
      isActive: true,
    }).lean();

    if (services.length !== serviceIds.length) {
      throw new Error("One or more services are invalid or inactive");
    }

    const addonServices = services.map((s: any) => ({
      serviceId: s._id,
      name: s.name,
      price: 0,
    }));

    cart.addonServices = addonServices;
    const totals = await CartPricingEngine.calculateCartTotals(cart);

    const pricingMap = new Map();

    const pricingList = await ServicePricing.find({
      serviceId: { $in: serviceIds },
      tierId: cart.tierId,
      locationId: cart.locationId,
    }).lean();

    pricingList.forEach((p) => {
      pricingMap.set(p.serviceId.toString(), p.price);
    });

    cart.addonServices = addonServices.map((s) => ({
      ...s,
      price: pricingMap.get(s.serviceId.toString()) ?? 0,
    }));

    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;
    await cart.save();

    return cart;
  }

  static async updateSchedule(userId: string, cartId: string, payload: any) {
    const { scheduledDate, scheduledTime } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status === "CHECKED_OUT") {
      throw new Error("Cannot update schedule after checkout");
    }

    if (!scheduledDate) {
      throw new Error("Scheduled date is required");
    }

    const date = new Date(scheduledDate);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid scheduled date");
    }

    const now = new Date();

    if (date < now) {
      throw new Error("Scheduled date cannot be in the past");
    }

    /**
     * OPTIONAL: future enhancement
     * - slot validation
     * - business hours validation
     * - blackout dates
     */

    cart.scheduledDate = date;

    if (scheduledTime) {
      cart.scheduledTime = scheduledTime;
    }

    await cart.save();
    return cart;
  }

  static async updateCustomerDetails(
    userId: string,
    cartId: string,
    payload: any,
  ) {
    const { name, email, phone, address, caste, gotra } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status === "CHECKED_OUT") {
      throw new Error("Cannot update customer details after checkout");
    }

    if (email && !email.includes("@")) {
      throw new Error("Invalid email format");
    }

    if (phone && phone.length < 10) {
      throw new Error("Invalid phone number");
    }

    cart.customerDetails = {
      name: name ?? cart.customerDetails?.name,
      email: email ?? cart.customerDetails?.email,
      phone: phone ?? cart.customerDetails?.phone,
      address: address ?? cart.customerDetails?.address,
      caste: caste ?? cart.customerDetails?.caste,
      gotra: gotra ?? cart.customerDetails?.gotra,
    };

    await cart.save();
    return cart;
  }

  static async updateCartNotes(userId: string, cartId: string, payload: any) {
    const { notes } = payload;

    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status === "CHECKED_OUT") {
      throw new Error("Cannot update notes after checkout");
    }

    cart.notes = notes;
    await cart.save();
    return cart;
  }

  static async recalculateCart(
    userId: string,
    cartId: string,
    session?: mongoose.ClientSession,
  ) {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    }).session(session || null);

    if (!cart) {
      throw new Error("Cart not found");
    }

    const totals = await CartPricingEngine.calculateCartTotals(cart);
    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;
    await cart.save({
      session: session ?? undefined,
    } as any);
    return cart;
  }

  static async validateCart(userId: string, cartId: string) {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (["EXPIRED", "CANCELLED"].includes(cart.status)) {
      throw new Error("Cart is not in a valid state");
    }

    const errors: string[] = [];

    if (cart.serviceId) {
      const serviceComponents = await ServiceComponent.find({
        serviceId: cart.serviceId,
        tierId: cart.tierId,
      }).lean();

      const requiredComponents = serviceComponents.filter((c) => c.isRequired);

      const selectedMap = new Set(
        (cart.selectedComponents || []).map((c: any) =>
          c.componentId.toString(),
        ),
      );

      for (const comp of requiredComponents) {
        if (!selectedMap.has(comp.componentId.toString())) {
          errors.push(`Missing required component: ${comp.name}`);
        }
      }

      if ((cart.selectedComponents || []).length === 0) {
        errors.push("No components selected for service");
      }
    }

    if (cart.packageId) {
      if (!cart.packageId) {
        errors.push("Invalid package selection");
      }
    }

    if (!cart.basePrice || cart.basePrice <= 0) {
      errors.push("Invalid base price");
    }

    if (!cart.totalAmount || cart.totalAmount <= 0) {
      errors.push("Invalid total amount");
    }

    if (!cart.scheduledDate) {
      errors.push("Scheduled date not set");
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }

  static async checkoutCart(userId: string, cartId: string) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      if (!userId) {
        throw new Error("Token missing");
      }

      if (!mongoose.Types.ObjectId.isValid(cartId)) {
        throw new Error("Invalid cartId");
      }

      const cart = await Cart.findOne({
        _id: cartId,
        userId,
      }).session(session);

      if (!cart) {
        throw new Error("Cart not found");
      }

      if (cart.status === "CHECKED_OUT") {
        throw new Error("Cart already checked out");
      }

      const validation = await this.validateCart(userId, cartId);

      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      await this.recalculateCart(userId, cartId, session);
      const freshCart = await Cart.findById(cartId).session(session).lean();

      if (!freshCart) {
        throw new Error("Cart not found after recalculation");
      }

      const bookingData = await BookingBuilder.buildFromCart(freshCart);
      const bookingPayload: Partial<IBooking> = {
        userId: new mongoose.Types.ObjectId(userId),
        cartId: freshCart._id,
        bookedBy: "CUSTOMER",
        entries: bookingData.entries,
        customerDetails: freshCart.customerDetails || {},
        pricing: bookingData.pricing,
        payment: {
          status: "PENDING",
        },
        status: "PENDING",
        cartSnapshot: freshCart,
      };

      if (freshCart.scheduledDate) {
        bookingPayload.scheduledAt = freshCart.scheduledDate;
      }

      if (freshCart.notes) {
        bookingPayload.notes = freshCart.notes;
      }

      const bookings = await Booking.create([bookingPayload], { session });
      const booking = bookings[0];

      if (!booking) {
        throw new Error("Failed to create booking");
      }

      cart.status = "CHECKED_OUT";
      cart.activeBookingId = booking._id;

      await cart.save({ session });

      await session.commitTransaction();

      return {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        totalAmount: booking.pricing.grandTotal,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async deleteCart(userId: string, cartId: string) {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId: userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status === "CHECKED_OUT") {
      throw new Error("Cannot delete a checked out cart");
    }

    if (["IN_PROGRESS", "COMPLETED"].includes(cart.status)) {
      throw new Error("Cannot delete an active or completed cart");
    }

    cart.status = "DELETED";
    await cart.save();
    return true;
  }
}

export default CartService;
