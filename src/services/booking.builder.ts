import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import type {
  IBookingEntry,
  IBookingComponent,
  IBookingServiceConfiguration,
} from "../models/booking.model.js";

interface BookingBuildResult {
  entries: IBookingEntry[];
  pricing: {
    subtotal: number;
    taxes: number;
    discount: number;
    grandTotal: number;
  };
}

export class BookingBuilder {
  static async buildFromCart(cart: any): Promise<BookingBuildResult> {
    if (cart.serviceId) {
      return await this.buildServiceBooking(cart);
    }

    if (cart.packageId) {
      return await this.buildPackageBooking(cart);
    }

    throw new Error("Invalid cart type");
  }

  static async buildServiceBooking(cart: any): Promise<BookingBuildResult> {
    const service = await Service.findById(cart.serviceId).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    const components: IBookingComponent[] = [
      ...(cart.selectedComponents || []).map((c: any) =>
        this.mapComponent(c, "DEFAULT"),
      ),
      ...(cart.addonComponents || []).map((c: any) =>
        this.mapComponent(c, "ADDON"),
      ),
    ];

    const entry: IBookingEntry = {
      entryType: "SERVICE" as const,
      serviceConfiguration: {
        serviceId: service._id,
        serviceSnapshot: {
          name: service.name,
          shortDescription: service.shortDescription,
          thumbnailImage: service.thumbnailImage ?? "",
          serviceReference: service.serviceReference,
        },
        serviceRole: "PRIMARY",
        tier: {
          tierId: cart.tierId,
          name: cart.tierName,
        },
        location: {
          locationId: cart.locationId,
          name: cart.locationName,
        },
        components,
        pricing: {
          subtotal: cart.totalAmount,
          taxes: 0,
          discount: 0,
          grandTotal: cart.totalAmount,
        },
      },
    };

    return {
      entries: [entry],

      pricing: {
        subtotal: cart.totalAmount,
        taxes: 0,
        discount: 0,
        grandTotal: cart.totalAmount,
      },
    };
  }

  static async buildPackageBooking(cart: any): Promise<BookingBuildResult> {
    const pkg = await Package.findById(cart.packageId).lean();

    if (!pkg) {
      throw new Error("Package not found");
    }

    const addonServices: IBookingServiceConfiguration[] = [];

    for (const addon of cart.addonServices || []) {
      const service = await Service.findById(addon.serviceId).lean();

      if (!service) continue;

      addonServices.push({
        serviceId: service._id,
        serviceSnapshot: {
          name: service.name,
          shortDescription: service.shortDescription,
          thumbnailImage: service.thumbnailImage ?? "",
          serviceReference: service.serviceReference,
        },
        serviceRole: "ADDON",
        tier: {
          tierId: cart.tierId,
          name: cart.tierName,
        },
        location: {
          locationId: cart.locationId,
          name: cart.locationName,
        },
        components: [],
        pricing: {
          subtotal: addon.price,
          taxes: 0,
          discount: 0,
          grandTotal: addon.price,
        },
      });
    }

    const entry: IBookingEntry = {
      entryType: "PACKAGE",

      packageConfiguration: {
        packageId: pkg._id,

        packageSnapshot: {
          name: pkg.name,
          shortDescription: pkg.shortDescription,
          thumbnailImage: pkg.thumbnailImage ?? "",
          packageReference: pkg.packageReference,
        },

        services: [],

        addonServices,

        pricing: {
          subtotal: cart.totalAmount,
          taxes: 0,
          discount: 0,
          grandTotal: cart.totalAmount,
        },
      },
    };

    return {
      entries: [entry],

      pricing: {
        subtotal: cart.totalAmount,
        taxes: 0,
        discount: 0,
        grandTotal: cart.totalAmount,
      },
    };
  }

  static mapComponent(
    component: any,
    componentType: "DEFAULT" | "ADDON",
  ): IBookingComponent {
    const itemsTotal = (component.items || []).reduce(
      (sum: number, item: any) => sum + (item.price || 0),
      0,
    );

    return {
      componentType,
      componentId: component.componentId,
      name: component.name,
      isRequired: componentType === "DEFAULT",
      isRemovable: componentType !== "DEFAULT",
      isBundled: false,
      selected: true,
      selectedItems: (component.items || []).map((item: any) => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
      })),
      pricing: {
        basePrice: 0,
        itemsTotal,
        total: itemsTotal,
      },
    };
  }
}
