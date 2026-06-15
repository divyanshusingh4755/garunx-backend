import mongoose, { Types } from "mongoose";
import {
  Cart,
  type IAddonService,
  type ICart,
  type ISelectedComponent,
  type ISelectedComponentItem,
  type ISelectedService,
} from "../models/cart.model.js";
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
import { PackageTierMap } from "../models/packagetiermap.model.js";
import type { HydratedDocument } from "mongoose";
import { CashfreeService } from "./cashfree.service.js";

interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  changes: string[];
  cart: ICart;
}

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

    const existingCart = await Cart.findOne({
      userId,
      serviceId,
      tierId,
      locationId,
      status: "ACTIVE",
    });

    if (existingCart) {
      throw new Error("Same service already exists in cart");
    }

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

    const existingCart = await Cart.findOne({
      userId,
      packageId,
      tierId,
      locationId,
      status: "ACTIVE",
    });

    if (existingCart) {
      throw new Error("Same package already exists in cart");
    }

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

  static async getUserCarts(userId: string, filters: any = {}) {
    if (!userId) {
      throw new Error("Token missing");
    }

    const query: any = {
      userId,
    };

    if (filters.status) {
      const statuses = filters.status.split(",").map((s: string) => s.trim());

      query.status = { $in: statuses };
    } else {
      query.status = {
        $nin: ["EXPIRED", "DELETED"],
      };
    }

    const carts = await Cart.find(query)
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

    // Service Cart
    if (cart.serviceId) {
      const service = await Service.findById(cart.serviceId).lean();
      if (!service) {
        throw new Error("Service not found");
      }

      // Fetch components for this service and tier
      const serviceComponents = await ServiceComponent.find({
        serviceId: service._id,
        tierId: cart.tierId,
      }).lean();

      const componentIds = serviceComponents.map((c) => c.componentId);
      const componentsMap = new Map(
        (await Component.find({ _id: { $in: componentIds } }).lean()).map(
          (c) => [c._id.toString(), c],
        ),
      );

      const itemIds = serviceComponents.flatMap(
        (c) => c.items?.map((i) => i.itemId) || [],
      );

      const itemsMap = new Map(
        (await ComponentItem.find({ _id: { $in: itemIds } }).lean()).map(
          (i) => [i._id.toString(), i],
        ),
      );

      // Hydrate selected components
      const hydratedSelectedComponents = (cart.selectedComponents || []).map(
        (comp) => ({
          ...comp,
          component: componentsMap.get(comp.componentId.toString()),
          items: (comp.items || []).map((item) => ({
            ...item,
            itemDetails: itemsMap.get(item.itemId.toString()),
          })),
        }),
      );

      const hydratedAddonComponents = (cart.addonComponents || []).map(
        (comp) => ({
          ...comp,
          component: componentsMap.get(comp.componentId?.toString()),
          items: (comp.items || []).map((item) => ({
            ...item,
            itemDetails: itemsMap.get(item.itemId.toString()),
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

    // Package Cart
    if (cart.packageId) {
      const pkg = (await Package.findById(cart.packageId)
        .populate("tierMappings")
        .lean({ virtuals: true })) as any;

      if (!pkg) {
        throw new Error("Package not found");
      }

      // Get services for this cart's tier
      const packageTierMap = pkg.tierMappings?.find(
        (m: any) => m.tierId.toString() === cart.tierId.toString(),
      );

      const serviceIds =
        packageTierMap?.services?.map(
          (s: {
            serviceId: mongoose.Types.ObjectId;
            name: string;
            isRequired: boolean;
          }) => s.serviceId,
        ) || [];

      // Fetch services
      const services = await Service.find({
        _id: { $in: serviceIds },
      }).lean();

      // Fetch all components for these services in this tier
      const serviceComponents = await ServiceComponent.find({
        serviceId: { $in: serviceIds },
        tierId: cart.tierId,
      }).lean();

      const componentIds = serviceComponents.map((c) => c.componentId);

      const componentsMap = new Map(
        (
          await Component.find({
            _id: { $in: componentIds },
          }).lean()
        ).map((c) => [c._id.toString(), c]),
      );

      const itemIds = serviceComponents.flatMap(
        (c) => c.items?.map((i) => i.itemId) || [],
      );

      const itemsMap = new Map(
        (
          await ComponentItem.find({
            _id: { $in: itemIds },
          }).lean()
        ).map((i) => [i._id.toString(), i]),
      );

      // Group service components by serviceId
      const serviceComponentMap = new Map<string, typeof serviceComponents>();

      for (const sc of serviceComponents) {
        const key = sc.serviceId.toString();

        let components = serviceComponentMap.get(key);

        if (!components) {
          components = [];
          serviceComponentMap.set(key, components);
        }

        components.push(sc);
      }

      // Hydrate services with components + component details + item details
      const hydratedServices = services.map((service) => {
        const comps = serviceComponentMap.get(service._id.toString()) || [];

        const hydratedComponents = comps.map((comp) => ({
          ...comp,
          component: componentsMap.get(comp.componentId.toString()),
          items: (comp.items || []).map((item) => ({
            ...item,
            itemDetails: itemsMap.get(item.itemId.toString()),
          })),
        }));

        return {
          ...service,
          components: hydratedComponents,
        };
      });

      /**
       * HYDRATE ADDON SERVICES
       */
      const addonServiceIds =
        cart.addonServices?.map((s: any) => s.serviceId) || [];

      const addonServicesFromDB = await Service.find({
        _id: { $in: addonServiceIds },
      }).lean();

      const addonServicesMap = new Map(
        addonServicesFromDB.map((service) => [service._id.toString(), service]),
      );

      const hydratedAddonServices = (cart.addonServices || []).map(
        (addon: any) => ({
          ...addon,
          service: addonServicesMap.get(addon.serviceId.toString()),
        }),
      );

      const selectedServiceIds =
        cart.selectedServices?.map((s: any) => s.serviceId) || [];

      const selectedServicesFromDB = await Service.find({
        _id: { $in: selectedServiceIds },
      }).lean();

      const selectedServicesMap = new Map(
        selectedServicesFromDB.map((s) => [s._id.toString(), s]),
      );

      const hydratedSelectedServices = (cart.selectedServices || []).map(
        (s: any) => ({
          ...s,
          service: selectedServicesMap.get(String(s.serviceId)),
        }),
      );

      return {
        ...cart,
        package: pkg,
        services: hydratedServices,
        selectedServices: hydratedSelectedServices,
        addonServices: hydratedAddonServices,
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
          (sc: any) => sc.componentId.toString() === c.componentId.toString(),
        );
      });

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required components: ${missingRequired
          .map((c) => c.name)
          .join(", ")}`,
      );
    }

    const formattedComponents: ISelectedComponent[] = [];

    for (const sc of selectedComponents || []) {
      const componentConfig = componentMap.get(sc.componentId.toString());

      if (!componentConfig) {
        throw new Error(`Invalid component`);
      }

      const pricing = await ServicePricing.findOne({
        serviceId: cart.serviceId,
        componentId: sc.componentId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      }).lean();

      if (!pricing) {
        throw new Error(`Pricing not found for ${componentConfig.name}`);
      }

      const allowedItems = componentConfig.items || [];
      const formattedItems: ISelectedComponentItem[] = [];

      for (const selectedItem of sc.items || []) {
        const matchedItem = allowedItems.find(
          (item) => item.itemId.toString() === selectedItem.itemId.toString(),
        );

        if (!matchedItem) {
          throw new Error(`Invalid item in ${componentConfig.name}`);
        }

        formattedItems.push({
          itemId: matchedItem.itemId,
          name: matchedItem.name,
        });
      }

      formattedComponents.push({
        componentId: componentConfig.componentId,
        name: componentConfig.name,
        items: formattedItems,
        totalPrice: pricing.price,
      });
    }

    cart.selectedComponents = formattedComponents;
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

    const updatedAddonComponents: ISelectedComponent[] = [];
    for (const ac of addonComponents || []) {
      const component = componentMap.get(ac.componentId);

      if (!component) {
        throw new Error("Invalid addon component for this service");
      }

      const pricing = await ServicePricing.findOne({
        serviceId: cart.serviceId,
        componentId: ac.componentId,
        tierId: cart.tierId,
        locationId: cart.locationId,
      }).lean();

      if (!pricing) {
        throw new Error(`Pricing not found for ${component.name}`);
      }

      const allowedItems = component.items || [];
      const formattedItems: ISelectedComponentItem[] = [];

      for (const itemId of ac.items || []) {
        const matchedItem = allowedItems.find(
          (item) => item.itemId.toString() === itemId.toString(),
        );

        if (!matchedItem) {
          throw new Error(`Invalid item selected for ${component.name}`);
        }

        formattedItems.push({
          itemId: matchedItem.itemId,
          name: matchedItem.name,
        });
      }

      updatedAddonComponents.push({
        componentId: component.componentId,
        name: component.name,
        items: formattedItems,
        totalPrice: pricing.price,
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

  static async updateSelectedServices(
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
      userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.packageId) {
      throw new Error("This operation is only allowed for package carts");
    }

    if (!Array.isArray(serviceIds)) {
      throw new Error("serviceIds must be an array");
    }

    const packageTierMap = await PackageTierMap.findOne({
      packageId: cart.packageId,
      tierId: cart.tierId,
    }).lean();

    if (!packageTierMap) {
      throw new Error("Package tier mapping not found");
    }

    const allowedServices = packageTierMap.services || [];

    const selectedServices: ISelectedService[] = [];

    const pricingList = await PackageTierPricing.find({
      packageId: cart.packageId,
      tierId: cart.tierId,
      locationId: cart.locationId,
      serviceId: { $in: serviceIds },
    }).lean();

    const pricingMap = new Map(
      pricingList.map((p) => [p.serviceId.toString(), p.finalPrice]),
    );

    for (const serviceId of serviceIds) {
      const matchedService = allowedServices.find(
        (s) => s.serviceId.toString() === serviceId.toString(),
      );

      if (!matchedService) {
        throw new Error(`Invalid addon service selected`);
      }

      const price = pricingMap.get(serviceId.toString()) ?? 0;

      selectedServices.push({
        serviceId: matchedService.serviceId,
        name: matchedService.name,
        price,
      });
    }

    cart.selectedServices = selectedServices;
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
      userId,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.packageId) {
      throw new Error("This operation is only allowed for package carts");
    }

    if (!Array.isArray(serviceIds)) {
      throw new Error("serviceIds must be an array");
    }

    const packageTierMap = await PackageTierMap.findOne({
      packageId: cart.packageId,
      tierId: cart.tierId,
    }).lean();

    if (!packageTierMap) {
      throw new Error("Package tier mapping not found");
    }

    const allowedServices = packageTierMap.services || [];

    const addonServices: IAddonService[] = [];

    const pricingList = await PackageTierPricing.find({
      packageId: cart.packageId,
      tierId: cart.tierId,
      locationId: cart.locationId,
      serviceId: { $in: serviceIds },
    }).lean();

    const pricingMap = new Map(
      pricingList.map((p) => [p.serviceId.toString(), p.finalPrice]),
    );

    for (const serviceId of serviceIds) {
      const matchedService = allowedServices.find(
        (s) => s.serviceId.toString() === serviceId.toString(),
      );

      if (!matchedService) {
        throw new Error(`Invalid addon service selected`);
      }

      const price = pricingMap.get(serviceId.toString()) ?? 0;

      addonServices.push({
        serviceId: matchedService.serviceId,
        name: matchedService.name,
        price,
      });
    }

    cart.addonServices = addonServices;
    const totals = await CartPricingEngine.calculateCartTotals(cart);
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
    options?: {
      session?: mongoose.ClientSession;
      persist?: boolean;
    },
  ) {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const cart = await Cart.findOne({
      _id: cartId,
      userId,
    }).session(options?.session || null);

    if (!cart) {
      throw new Error("Cart not found");
    }

    const oldValues = {
      basePrice: cart.basePrice,
      addonPrice: cart.addonPrice,
      totalAmount: cart.totalAmount,
    };

    const totals = await CartPricingEngine.calculateCartTotals(cart);
    cart.basePrice = totals.basePrice;
    cart.addonPrice = totals.addonPrice;
    cart.totalAmount = totals.totalAmount;

    const changes: string[] = [];

    if (oldValues.basePrice !== cart.basePrice) {
      changes.push(
        `Base price changed from ${oldValues.basePrice} to ${cart.basePrice}`,
      );
    }

    if (oldValues.addonPrice !== cart.addonPrice) {
      changes.push(
        `Addon price changed from ${oldValues.addonPrice} to ${cart.addonPrice}`,
      );
    }

    if (oldValues.totalAmount !== cart.totalAmount) {
      changes.push(
        `Total amount changed from ${oldValues.totalAmount} to ${cart.totalAmount}`,
      );
    }

    if (options?.persist) {
      await cart.save({
        session: options.session ?? undefined,
      } as any);
    }

    return {
      cart,
      changes,
    };
  }

  static async validateCart(
    userId: string,
    cartId: string,
    persist: boolean,
    session?: mongoose.ClientSession,
  ): Promise<CartValidationResult> {
    if (!userId) {
      throw new Error("Token missing");
    }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error("Invalid cartId");
    }

    const recalculated = await this.recalculateCart(userId, cartId, {
      persist: persist,
      ...(session ? { session } : {}),
    });

    const cart = recalculated.cart;
    const changes = recalculated.changes;

    if (["EXPIRED", "CANCELLED"].includes(cart.status)) {
      throw new Error("Cart is not in a valid state");
    }

    const errors: string[] = [];

    if (cart.serviceId) {
      const serviceComponents = await ServiceComponent.find({
        serviceId: cart.serviceId,
        tierId: cart.tierId,
      })
        .session(session || null)
        .lean();

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

    if (
      cart.packageId &&
      !mongoose.Types.ObjectId.isValid(cart.packageId.toString())
    ) {
      errors.push("Invalid package selection");
    }

    if (!cart.basePrice || cart.basePrice <= 0) {
      errors.push("Invalid base price");
    }

    if (!cart.totalAmount || cart.totalAmount <= 0) {
      errors.push("Invalid total amount");
    }

    return {
      isValid: errors.length === 0,
      errors,
      changes,
      cart,
    };
  }

  static async checkoutCart(userId: string, cartId: string) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(
        async (): Promise<HydratedDocument<IBooking>> => {
          if (!userId) {
            throw new Error("Token missing");
          }

          if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
          }

          const cart = await Cart.findOne(
            {
              _id: cartId,
              userId,
              status: {
                $in: ["ACTIVE", "SCHEDULED", "CHECKOUT_PENDING"],
              },
            },
            null,
            { session },
          );

          if (!cart) {
            throw new Error("Cart not found");
          }

          /**
           * Reuse existing booking if checkout already started
           */
          if (cart.activeBookingId) {
            const existingBooking = await Booking.findById(
              cart.activeBookingId,
            ).session(session);

            if (existingBooking && existingBooking.payment.status !== "PAID") {
              return existingBooking;
            }
          }

          if (!cart.scheduledDate) {
            throw new Error("Scheduled date not set");
          }

          const validation = await this.validateCart(
            userId,
            cartId,
            true,
            session,
          );

          if (!validation.isValid) {
            throw new Error(validation.errors.join(", "));
          }

          const expiry = new Date(Date.now() + 30 * 60 * 1000);
          const checkoutExpiry = expiry;
          const paymentExpiry = expiry;

          const lockedCart = await Cart.findOneAndUpdate(
            {
              _id: cartId,
              status: { $in: ["ACTIVE", "SCHEDULED"] },
            },
            {
              $set: {
                status: "CHECKOUT_PENDING",
                checkoutExpiresAt: checkoutExpiry,
              },
            },
            {
              new: true,
              session,
            },
          );

          if (!lockedCart) {
            throw new Error("Checkout already initiated");
          }

          const bookingData = await BookingBuilder.buildFromCart(lockedCart);

          const bookingPayload: Partial<IBooking> = {
            userId: new mongoose.Types.ObjectId(userId),
            cartId: lockedCart._id,
            bookedBy: "CUSTOMER",
            entries: bookingData.entries,
            customerDetails: lockedCart.customerDetails!,
            pricing: bookingData.pricing,
            payment: {
              status: "PENDING",
            },
            paymentExpiresAt: paymentExpiry,
            status: "PENDING",
            scheduledAt: lockedCart.scheduledDate!,

            ...(lockedCart.notes ? { notes: lockedCart.notes } : {}),

            cartSnapshot: lockedCart.toObject(),
          };

          const bookings = await Booking.create([bookingPayload], { session });

          const createdBooking = bookings[0];

          if (!createdBooking) {
            throw new Error("Failed to create booking");
          }

          await Cart.updateOne(
            { _id: lockedCart._id },
            { $set: { activeBookingId: createdBooking._id } },
            { session },
          );

          return createdBooking;
        },
      );

      /**
       * Now fully safe — no `never`
       */
      const finalBooking = result;

      /**
       * Payment already completed
       */
      if (finalBooking.payment.status === "PAID") {
        return {
          bookingId: finalBooking._id,
          bookingReference: finalBooking.bookingReference,
          totalAmount: finalBooking.pricing.grandTotal,
          paymentCompleted: true,
        };
      }

      /**
       * Create Cashfree order/session (outside transaction)
       */

      const cashfreeOrder = await CashfreeService.createOrder({
        orderId: finalBooking.bookingReference,
        amount: finalBooking.pricing.grandTotal,
        customerName: finalBooking.customerDetails?.name || "Customer",
        customerEmail: finalBooking.customerDetails?.email || "",
        customerPhone: finalBooking.customerDetails?.phone || "",
        userId: userId,
      });

      await Booking.updateOne(
        { _id: finalBooking._id },
        {
          $set: {
            "payment.providerOrderId": cashfreeOrder.order_id,
            "payment.paymentSessionId": cashfreeOrder.payment_session_id,
            "payment.lastAttemptAt": new Date(),
            "payment.status": "PENDING",
          },
          $inc: {
            "payment.attempts": 1,
          },
        },
      );

      return {
        bookingId: finalBooking._id,
        bookingReference: finalBooking.bookingReference,
        totalAmount: finalBooking.pricing.grandTotal,
        paymentSessionId: cashfreeOrder.payment_session_id,
      };
    } finally {
      await session.endSession();
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

  static async expireCheckoutPendingCarts() {
    const now = new Date();

    await Cart.updateMany(
      {
        status: "CHECKOUT_PENDING",
        checkoutExpiresAt: {
          $lte: now,
        },
      },
      {
        $set: {
          status: "ACTIVE",
        },

        $unset: {
          checkoutExpiresAt: 1,
        },
      },
    );
  }
}

export default CartService;
