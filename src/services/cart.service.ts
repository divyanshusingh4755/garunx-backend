import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
// import { Booking } from "../models/booking.model.js";

class CartService {
  static async createServiceCart(userId: string, payload: any) {
    const { serviceId, tierId, locationId } = payload;

    if (!serviceId || !tierId || !locationId) {
      throw new Error("serviceId, tierId and locationId are required");
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId);

    if (!service || !service.isActive) {
      throw new Error("Service not found or inactive");
    }

    const isTierValid = service.tiers.some(
      (t) => t.tierId.toString() === tierId,
    );

    if (!isTierValid) {
      throw new Error("Invalid tier for this service");
    }

    const isLocationValid = service.locations.some(
      (l) => l.locationId.toString() === locationId,
    );

    if (!isLocationValid) {
      throw new Error("Invalid location for this service");
    }

    const pricing = await ServicePricing.findOne({
      serviceId,
      tierId,
      locationId,
    });

    if (!pricing) {
      throw new Error("Pricing not found for selected configuration");
    }

    const cart = await Cart.create({
      userId: userId,
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
      basePrice: pricing.price,
      addonPrice: 0,
      totalAmount: pricing.price,
      status: "ACTIVE",
    });

    return cart;
  }

  static async createPackageCart(userId: string, payload: any) {
    const { packageId, tierId, locationId } = payload;

    if (!packageId || !tierId || !locationId) {
      throw new Error("packageId, tierId and locationId are required");
    }

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg || !pkg.isActive) {
      throw new Error("Package not found or inactive");
    }

    const isTierValid = pkg.tiers.some((t) => t.tierId.toString() === tierId);

    if (!isTierValid) {
      throw new Error("Invalid tier for this package");
    }

    const isLocationValid = pkg.locations.some(
      (l) => l.locationId.toString() === locationId,
    );

    if (!isLocationValid) {
      throw new Error("Invalid location for this package");
    }

    const pricing = await PackageTierPricing.findOne({
      packageId,
      tierId,
      locationId,
    });

    if (!pricing) {
      throw new Error("Pricing not found for selected package configuration");
    }

    const cart = await Cart.create({
      userId: userId,
      packageId: pkg._id,
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
      basePrice: pricing.finalPrice,
      addonPrice: 0,
      totalAmount: pricing.finalPrice,
      status: "ACTIVE",
    });

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
    });

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
        ...cart.toObject(),
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
        ...cart.toObject(),
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

    let totalComponentPrice = 0;

    const updatedComponents = [];

    for (const sc of selectedComponents || []) {
      const component = componentMap.get(sc.componentId);

      if (!component) {
        throw new Error("Invalid component selected");
      }

      const items = await ComponentItem.find({
        _id: { $in: sc.items },
      }).lean();

      if (items.length !== sc.items.length) {
        throw new Error("Invalid component items selected");
      }

      const itemPrice = items.reduce((sum, i: any) => sum + (i.price || 0), 0);

      totalComponentPrice += itemPrice;

      updatedComponents.push({
        componentId: sc.componentId,
        name: component.name,
        items: items.map((i) => ({
          itemId: i._id,
          name: i.name,
          price: i.price ?? 0,
        })),
        totalPrice: itemPrice,
      });
    }

    cart.selectedComponents = updatedComponents;
    cart.addonPrice = cart.addonPrice || 0;
    cart.totalAmount = cart.basePrice + totalComponentPrice + cart.addonPrice;

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

    let totalAddonPrice = 0;

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

      const itemPrice = items.reduce((sum, i: any) => sum + (i.price || 0), 0);

      totalAddonPrice += itemPrice;

      updatedAddonComponents.push({
        componentId: ac.componentId,
        name: component.name,
        items: items.map((i) => ({
          itemId: i._id,
          name: i.name,
          price: i.price ?? 0,
        })),
        totalPrice: itemPrice,
      });
    }

    cart.addonComponents = updatedAddonComponents;
    cart.addonPrice = totalAddonPrice;
    cart.totalAmount =
      cart.basePrice +
      (cart.selectedComponents || []).reduce(
        (sum: number, c: any) => sum + (c.totalPrice || 0),
        0,
      ) +
      totalAddonPrice;

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

    let totalAddonPrice = 0;
    const addonServices = services.map((s: any) => {
      const price = s.basePrice || 0; // safe fallback

      totalAddonPrice += price;

      return {
        serviceId: s._id,
        name: s.name,
        price,
      };
    });

    cart.addonServices = addonServices;
    cart.addonPrice = totalAddonPrice;
    cart.totalAmount = cart.basePrice + totalAddonPrice;
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

  static async recalculateCart(userId: string, cartId: string) {
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

    let basePrice = cart.basePrice || 0;
    let componentTotal = 0;
    let addonTotal = 0;

    if (cart.serviceId) {
      const servicePricing = await ServicePricing.findOne({
        serviceId: cart.serviceId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      });

      if (servicePricing) {
        basePrice = servicePricing.price;
      }

      for (const comp of cart.selectedComponents || []) {
        const items = await ComponentItem.find({
          _id: {
            $in: comp.items.map((i: any) => i.itemId),
          },
        }).lean();

        componentTotal += items.reduce(
          (sum, i: any) => sum + (i.price || 0),
          0,
        );
      }

      for (const comp of cart.addonComponents || []) {
        const items = await ComponentItem.find({
          _id: {
            $in: comp.items.map((i: any) => i.itemId),
          },
        }).lean();

        addonTotal += items.reduce((sum, i: any) => sum + (i.price || 0), 0);
      }
    }

    if (cart.packageId) {
      const packagePricing = await PackageTierPricing.findOne({
        packageId: cart.packageId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      });

      if (packagePricing) {
        basePrice = packagePricing.finalPrice;
      }

      for (const service of cart.addonServices || []) {
        const servicePricing = await ServicePricing.findOne({
          serviceId: service.serviceId,
          tierId: cart.tierId,
          locationId: cart.locationId,
        });

        addonTotal += servicePricing?.price || 0;
      }
    }

    cart.basePrice = basePrice;
    cart.addonPrice = componentTotal + addonTotal;
    cart.totalAmount = basePrice + cart.addonPrice;

    await cart.save();
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

  // static async checkoutCart(userId: string, cartId: string) {
  //   if (!userId) {
  //     throw new Error("Token missing");
  //   }

  //   if (!mongoose.Types.ObjectId.isValid(cartId)) {
  //     throw new Error("Invalid cartId");
  //   }

  //   const cart = await Cart.findOne({
  //     _id: cartId,
  //     userId: userId,
  //   });

  //   if (!cart) {
  //     throw new Error("Cart not found");
  //   }

  //   if (cart.status === "CHECKED_OUT") {
  //     throw new Error("Cart already checked out");
  //   }

  //   const validation = await this.validateCart(user, cartId);

  //   if (!validation.isValid) {
  //     throw new Error(validation.errors.join(", "));
  //   }

  //   await this.recalculateCart(user, cartId);

  //   const freshCart = await Cart.findById(cartId).lean();

  //   const booking = await Booking.create({
  //     userId: user._id,
  //     cartId: freshCart._id,
  //     serviceId: freshCart.serviceId,
  //     packageId: freshCart.packageId,
  //     tierId: freshCart.tierId,
  //     locationId: freshCart.locationId,
  //     scheduledDate: freshCart.scheduledDate,
  //     customerDetails: freshCart.customerDetails,
  //     items: {
  //       selectedComponents: freshCart.selectedComponents || [],
  //       addonComponents: freshCart.addonComponents || [],
  //       addonServices: freshCart.addonServices || [],
  //     },
  //     pricing: {
  //       basePrice: freshCart.basePrice,
  //       addonPrice: freshCart.addonPrice,
  //       totalAmount: freshCart.totalAmount,
  //     },
  //     status: "PENDING",
  //   });

  //   await Cart.updateOne(
  //     { _id: cartId },
  //     {
  //       status: "CHECKED_OUT",
  //       activeBookingId: booking._id,
  //     },
  //   );

  //   return {
  //     bookingId: booking._id,
  //     cartId,
  //     totalAmount: freshCart.totalAmount,
  //   };
  // }

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
