import { Package } from "../models/package.model.js";

import { Service } from "../models/service.model.js";

import type {
  IBookingEntry,
  IBookingComponent,
  IBookingServiceConfiguration,
  IBookingTaxSummary,
  ComponentType,
} from "../models/booking.model.js";

import type { ICart, ISelectedComponent } from "../models/cart.model.js";

import type { Types } from "mongoose";

import { Component, type IComponent } from "../models/component.model.js";

import { ServiceComponent } from "../models/servicecomponent.model.js";

interface PackageCartServiceLine {
  serviceId: Types.ObjectId;
  priceBeforeDiscount: number;
  discountAmount: number;
  price: number;
  tax?: ISelectedComponent["tax"];
}

interface BookingBuildResult {
  entries: IBookingEntry[];
  pricing: {
    baseAmount: number;
    addonAmount: number;
    subtotal: number;
    couponId?: Types.ObjectId;
    couponCode?: string;
    discountAmount: number;
    taxSummary: IBookingTaxSummary;
    grandTotal: number;
  };
}

type CartWithOptionalToObject = ICart & {
  toObject?: () => ICart;
};

export class BookingBuilder {
  private static toPlainCart(cart: ICart): ICart {
    const possibleDocument = cart as CartWithOptionalToObject;

    if (typeof possibleDocument.toObject === "function") {
      return possibleDocument.toObject();
    }

    return cart;
  }

  private static validateCartType(cart: ICart): "SERVICE" | "PACKAGE" {
    const hasService = Boolean(cart.serviceId);

    const hasPackage = Boolean(cart.packageId);

    if (hasService === hasPackage) {
      throw new Error(
        hasService
          ? "Cart cannot contain both serviceId and packageId"
          : "Cart must contain either serviceId or packageId",
      );
    }

    return hasService ? "SERVICE" : "PACKAGE";
  }

  private static buildTaxSummary(
    taxSummary: ICart["taxSummary"],
  ): IBookingTaxSummary {
    return {
      taxableAmount: taxSummary?.taxableAmount ?? 0,
      cgstAmount: taxSummary?.cgstAmount ?? 0,
      sgstAmount: taxSummary?.sgstAmount ?? 0,
      igstAmount: taxSummary?.igstAmount ?? 0,
      totalTax: taxSummary?.totalTax ?? 0,
      ...(taxSummary?.supplierStateCode
        ? {
          supplierStateCode: taxSummary.supplierStateCode,
        }
        : {}),
      ...(taxSummary?.placeOfSupplyStateCode
        ? {
          placeOfSupplyStateCode: taxSummary.placeOfSupplyStateCode,
        }
        : {}),
    };
  }

  private static buildMainPricing(cart: ICart): BookingBuildResult["pricing"] {
    return {
      baseAmount: cart.basePrice,
      addonAmount: cart.addonPrice,
      subtotal: cart.subtotal,
      ...(cart.couponId && cart.couponCode
        ? {
          couponId: cart.couponId,
          couponCode: cart.couponCode,
        }
        : {}),
      discountAmount: cart.discountAmount,
      taxSummary: this.buildTaxSummary(cart.taxSummary),
      grandTotal: cart.totalAmount,
    };
  }

  static async buildFromCart(cart: ICart): Promise<BookingBuildResult> {
    const cartType = this.validateCartType(cart);

    return cartType === "SERVICE"
      ? this.buildServiceBooking(cart)
      : this.buildPackageBooking(cart);
  }

  static async buildServiceBooking(cart: ICart): Promise<BookingBuildResult> {
    if (!cart.serviceId) {
      throw new Error("Service ID is required for service booking");
    }

    if (cart.packageId) {
      throw new Error("Service booking cart cannot contain packageId");
    }

    const service = await Service.findById(cart.serviceId).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    const plainCart = this.toPlainCart(cart);

    const selectedComponents = [
      ...(plainCart.selectedComponents ?? []).map((component) => ({
        ...component,
        componentType: "DEFAULT" as const,
      })),
      ...(plainCart.addonComponents ?? []).map((component) => ({
        ...component,
        componentType: "ADDON" as const,
      })),
    ];

    const components = await this.buildComponentSnapshots(
      selectedComponents,
      service._id,
      cart.tierId,
    );

    const entry: IBookingEntry = {
      entryType: "SERVICE",
      serviceConfiguration: {
        serviceId: service._id,
        serviceSnapshot: {
          name: service.name,
          ...(service.shortDescription
            ? {
              shortDescription: service.shortDescription,
            }
            : {}),
          ...(service.thumbnailImage
            ? {
              thumbnailImage: service.thumbnailImage,
            }
            : {}),
          ...(service.serviceReference
            ? {
              serviceReference: service.serviceReference,
            }
            : {}),
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
          priceBeforeDiscount: cart.subtotal,
          discountAmount: cart.discountAmount,
          finalAmount: cart.totalAmount,
          taxSummary: this.buildTaxSummary(cart.taxSummary),
        },
      },
    };

    return {
      entries: [entry],
      pricing: this.buildMainPricing(cart),
    };
  }

  static async buildPackageBooking(cart: ICart): Promise<BookingBuildResult> {
    if (!cart.packageId) {
      throw new Error("Package ID is required for package booking");
    }

    if (cart.serviceId) {
      throw new Error("Package booking cart cannot contain serviceId");
    }

    const packageDocument = await Package.findById(cart.packageId).lean();

    if (!packageDocument) {
      throw new Error("Package not found");
    }

    const selectedCartServices = cart.selectedServices ?? [];

    const addonCartServices = cart.addonServices ?? [];

    const allServiceIds = [
      ...selectedCartServices.map((service) => service.serviceId),
      ...addonCartServices.map((service) => service.serviceId),
    ];

    const services =
      allServiceIds.length > 0
        ? await Service.find({
          _id: {
            $in: allServiceIds,
          },
        }).lean()
        : [];

    const serviceMap = new Map(
      services.map((service) => [service._id.toString(), service]),
    );

    const selectedServices: IBookingServiceConfiguration[] = [];

    for (const selectedService of selectedCartServices) {
      const service = serviceMap.get(selectedService.serviceId.toString());

      if (!service) {
        throw new Error(
          `Service not found: ${selectedService.serviceId.toString()}`,
        );
      }

      selectedServices.push(
        this.buildPackageServiceConfiguration(
          cart,
          service,
          selectedService,
          "INCLUDED",
        ),
      );
    }

    const addonServices: IBookingServiceConfiguration[] = [];

    for (const addonService of addonCartServices) {
      const service = serviceMap.get(addonService.serviceId.toString());

      if (!service) {
        throw new Error(
          `Addon service not found: ${addonService.serviceId.toString()}`,
        );
      }

      addonServices.push(
        this.buildPackageServiceConfiguration(
          cart,
          service,
          addonService,
          "ADDON",
        ),
      );
    }

    const entry: IBookingEntry = {
      entryType: "PACKAGE",
      packageConfiguration: {
        packageId: packageDocument._id,
        packageSnapshot: {
          name: packageDocument.name,
          ...(packageDocument.shortDescription
            ? {
              shortDescription: packageDocument.shortDescription,
            }
            : {}),
          ...(packageDocument.thumbnailImage
            ? {
              thumbnailImage: packageDocument.thumbnailImage,
            }
            : {}),
          ...(packageDocument.packageReference
            ? {
              packageReference: packageDocument.packageReference,
            }
            : {}),
        },
        selectedServices,
        addonServices,
        pricing: {
          baseAmount: cart.basePrice,
          addonAmount: cart.addonPrice,
          subtotal: cart.subtotal,
          discountAmount: cart.discountAmount,
          taxSummary: this.buildTaxSummary(cart.taxSummary),
          grandTotal: cart.totalAmount,
        },
      },
    };

    return {
      entries: [entry],
      pricing: this.buildMainPricing(cart),
    };
  }

  private static buildPackageServiceConfiguration(
    cart: ICart,
    service: {
      _id: Types.ObjectId;
      name: string;
      shortDescription?: string;
      thumbnailImage?: string;
      serviceReference?: string;
    },
    selectedService: PackageCartServiceLine,
    serviceRole: "INCLUDED" | "ADDON",
  ): IBookingServiceConfiguration {
    return {
      serviceId: service._id,
      serviceSnapshot: {
        name: service.name,
        ...(service.shortDescription
          ? {
            shortDescription: service.shortDescription,
          }
          : {}),
        ...(service.thumbnailImage
          ? {
            thumbnailImage: service.thumbnailImage,
          }
          : {}),
        ...(service.serviceReference
          ? {
            serviceReference: service.serviceReference,
          }
          : {}),
      },
      serviceRole,
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
        priceBeforeDiscount: selectedService.priceBeforeDiscount,
        discountAmount: selectedService.discountAmount,
        finalAmount: selectedService.price,
        ...(selectedService.tax
          ? {
            tax: selectedService.tax,
          }
          : {}),
        taxSummary: this.buildTaxSummaryFromLine(selectedService.tax),
      },
    };
  }

  private static buildTaxSummaryFromLine(
    tax: ISelectedComponent["tax"] | undefined,
  ): IBookingTaxSummary {
    if (!tax) {
      return {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
      };
    }

    return {
      taxableAmount: tax.taxableAmount,
      cgstAmount: tax.cgstAmount,
      sgstAmount: tax.sgstAmount,
      igstAmount: tax.igstAmount,
      totalTax: tax.totalTax,
    };
  }

  private static async buildComponentSnapshots(
    components: Array<
      ISelectedComponent & {
        componentType: ComponentType;
      }
    >,
    serviceId: Types.ObjectId,
    tierId: Types.ObjectId,
  ): Promise<IBookingComponent[]> {
    if (components.length === 0) {
      return [];
    }

    const componentIds = components.map((component) => component.componentId);

    const [componentDocs, serviceComponents] = await Promise.all([
      Component.find({
        _id: {
          $in: componentIds,
        },
      }).lean(),

      ServiceComponent.find({
        serviceId,
        tierId,
        componentId: {
          $in: componentIds,
        },
      }).lean(),
    ]);

    const componentMap = new Map(
      componentDocs.map((component: IComponent) => [component._id.toString(), component]),
    );

    const serviceComponentMap = new Map(
      serviceComponents.map((serviceComponent) => [
        serviceComponent.componentId.toString(),
        serviceComponent,
      ]),
    );

    return components.map((component): IBookingComponent => {
      const componentId = component.componentId.toString();

      const componentDocument = componentMap.get(componentId);

      const serviceComponent = serviceComponentMap.get(componentId);

      const bookingComponent: IBookingComponent = {
        componentType:
          component.componentType,

        componentId:
          component.componentId,

        name:
          componentDocument?.name ??
          component.name,

        isRequired:
          serviceComponent?.isRequired ??
          false,

        isRemovable:
          componentDocument?.isRemovable ??
          false,

        isBundled:
          componentDocument?.isBundled ??
          false,

        selected:
          true,

        selectedItems:
          (component.items ?? []).map(
            (item) => ({
              itemId:
                item.itemId,

              name:
                item.name,
            }),
          ),

        pricing: {
          priceBeforeDiscount:
            component.priceBeforeDiscount,

          discountAmount:
            component.discountAmount,

          finalAmount:
            component.totalPrice,

          ...(component.tax
            ? {
              tax:
                component.tax,
            }
            : {}),
        },
      };

      if (serviceComponent?._id) {
        bookingComponent.serviceComponentId =
          serviceComponent._id;
      }

      if (componentDocument?.description) {
        bookingComponent.description =
          componentDocument.description;
      }

      if (componentDocument?.imageUrl) {
        bookingComponent.imageUrl =
          componentDocument.imageUrl;
      }

      return bookingComponent;
    });
  }
}
