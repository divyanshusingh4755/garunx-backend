import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";

import type {
  IBookingEntry,
  IBookingComponent,
  IBookingServiceConfiguration,
  IBookingTaxSummary,
  ComponentType,
} from "../models/booking.model.js";

import type {
  ICart,
  ISelectedComponent,
} from "../models/cart.model.js";

import type { Types } from "mongoose";

import { Component } from "../models/component.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";

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

export class BookingBuilder {
  private static buildTaxSummary(
    taxSummary: ICart["taxSummary"],
  ): IBookingTaxSummary {
    return {
      taxableAmount:
        taxSummary?.taxableAmount ?? 0,

      cgstAmount:
        taxSummary?.cgstAmount ?? 0,

      sgstAmount:
        taxSummary?.sgstAmount ?? 0,

      igstAmount:
        taxSummary?.igstAmount ?? 0,

      totalTax:
        taxSummary?.totalTax ?? 0,

      ...(taxSummary?.supplierStateCode
        ? {
          supplierStateCode:
            taxSummary.supplierStateCode,
        }
        : {}),

      ...(taxSummary?.placeOfSupplyStateCode
        ? {
          placeOfSupplyStateCode:
            taxSummary.placeOfSupplyStateCode,
        }
        : {}),
    };
  }

  private static buildMainPricing(
    cart: ICart,
  ): BookingBuildResult["pricing"] {
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

      discountAmount:
        cart.discountAmount,

      taxSummary:
        this.buildTaxSummary(cart.taxSummary),

      grandTotal:
        cart.totalAmount,
    };
  }

  static async buildFromCart(
    cart: ICart,
  ): Promise<BookingBuildResult> {
    if (cart.serviceId) {
      return this.buildServiceBooking(cart);
    }

    if (cart.packageId) {
      return this.buildPackageBooking(cart);
    }

    throw new Error("Invalid cart type");
  }

  static async buildServiceBooking(
    cart: ICart,
  ): Promise<BookingBuildResult> {
    if (!cart.serviceId) {
      throw new Error(
        "Service ID is required for service booking",
      );
    }

    const service = await Service.findById(
      cart.serviceId,
    ).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    const plainCart =
      cart.toObject() as ICart;

    const selectedComponents = [
      ...(plainCart.selectedComponents ?? []).map(
        (component) => ({
          ...component,
          componentType:
            "DEFAULT" as const,
        }),
      ),

      ...(plainCart.addonComponents ?? []).map(
        (component) => ({
          ...component,
          componentType:
            "ADDON" as const,
        }),
      ),
    ];

    const components =
      await this.buildComponentSnapshots(
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
              shortDescription:
                service.shortDescription,
            }
            : {}),

          ...(service.thumbnailImage
            ? {
              thumbnailImage:
                service.thumbnailImage,
            }
            : {}),

          ...(service.serviceReference
            ? {
              serviceReference:
                service.serviceReference,
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
          priceBeforeDiscount:
            cart.subtotal,

          discountAmount:
            cart.discountAmount,

          finalAmount:
            cart.totalAmount,

          taxSummary:
            this.buildTaxSummary(
              cart.taxSummary,
            ),
        },
      },
    };

    return {
      entries: [entry],
      pricing: this.buildMainPricing(cart),
    };
  }

  static async buildPackageBooking(
    cart: ICart,
  ): Promise<BookingBuildResult> {
    if (!cart.packageId) {
      throw new Error(
        "Package ID is required for package booking",
      );
    }

    const pkg = await Package.findById(
      cart.packageId,
    ).lean();

    if (!pkg) {
      throw new Error("Package not found");
    }

    const allServiceIds = [
      ...(cart.selectedServices ?? []).map(
        (service) => service.serviceId,
      ),

      ...(cart.addonServices ?? []).map(
        (service) => service.serviceId,
      ),
    ];

    const services = await Service.find({
      _id: {
        $in: allServiceIds,
      },
    }).lean();

    const serviceMap = new Map(
      services.map((service) => [
        service._id.toString(),
        service,
      ]),
    );

    const selectedServices:
      IBookingServiceConfiguration[] = [];

    for (
      const selectedService of
      cart.selectedServices ?? []
    ) {
      const service = serviceMap.get(
        selectedService.serviceId.toString(),
      );

      if (!service) {
        throw new Error(
          `Service not found: ${selectedService.serviceId.toString()}`,
        );
      }

      const taxSummary =
        this.buildTaxSummaryFromLine(
          selectedService.tax,
        );

      const configuration:
        IBookingServiceConfiguration = {
        serviceId: service._id,

        serviceSnapshot: {
          name: service.name,

          ...(service.shortDescription
            ? {
              shortDescription:
                service.shortDescription,
            }
            : {}),

          ...(service.thumbnailImage
            ? {
              thumbnailImage:
                service.thumbnailImage,
            }
            : {}),

          ...(service.serviceReference
            ? {
              serviceReference:
                service.serviceReference,
            }
            : {}),
        },

        serviceRole: "INCLUDED",

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
          priceBeforeDiscount:
            selectedService.priceBeforeDiscount,

          discountAmount:
            selectedService.discountAmount,

          finalAmount:
            selectedService.price,

          ...(selectedService.tax
            ? {
              tax: selectedService.tax,
            }
            : {}),

          taxSummary,
        },
      };

      selectedServices.push(configuration);
    }

    const addonServices:
      IBookingServiceConfiguration[] = [];

    for (
      const addonService of
      cart.addonServices ?? []
    ) {
      const service = serviceMap.get(
        addonService.serviceId.toString(),
      );

      if (!service) {
        throw new Error(
          `Addon service not found: ${addonService.serviceId.toString()}`,
        );
      }

      const taxSummary =
        this.buildTaxSummaryFromLine(
          addonService.tax,
        );

      const configuration:
        IBookingServiceConfiguration = {
        serviceId: service._id,

        serviceSnapshot: {
          name: service.name,

          ...(service.shortDescription
            ? {
              shortDescription:
                service.shortDescription,
            }
            : {}),

          ...(service.thumbnailImage
            ? {
              thumbnailImage:
                service.thumbnailImage,
            }
            : {}),

          ...(service.serviceReference
            ? {
              serviceReference:
                service.serviceReference,
            }
            : {}),
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
          priceBeforeDiscount:
            addonService.priceBeforeDiscount,

          discountAmount:
            addonService.discountAmount,

          finalAmount:
            addonService.price,

          ...(addonService.tax
            ? {
              tax: addonService.tax,
            }
            : {}),

          taxSummary,
        },
      };

      addonServices.push(configuration);
    }

    const entry: IBookingEntry = {
      entryType: "PACKAGE",

      packageConfiguration: {
        packageId: pkg._id,

        packageSnapshot: {
          name: pkg.name,

          ...(pkg.shortDescription
            ? {
              shortDescription:
                pkg.shortDescription,
            }
            : {}),

          ...(pkg.thumbnailImage
            ? {
              thumbnailImage:
                pkg.thumbnailImage,
            }
            : {}),

          ...(pkg.packageReference
            ? {
              packageReference:
                pkg.packageReference,
            }
            : {}),
        },

        selectedServices,
        addonServices,

        pricing: {
          baseAmount:
            cart.basePrice,

          addonAmount:
            cart.addonPrice,

          subtotal:
            cart.subtotal,

          discountAmount:
            cart.discountAmount,

          taxSummary:
            this.buildTaxSummary(
              cart.taxSummary,
            ),

          grandTotal:
            cart.totalAmount,
        },
      },
    };

    return {
      entries: [entry],
      pricing: this.buildMainPricing(cart),
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

    const componentIds = components.map(
      (component) =>
        component.componentId,
    );

    const [
      componentDocs,
      serviceComponents,
    ] = await Promise.all([
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
      componentDocs.map((component) => [
        component._id.toString(),
        component,
      ]),
    );

    const serviceComponentMap = new Map(
      serviceComponents.map(
        (serviceComponent) => [
          serviceComponent.componentId.toString(),
          serviceComponent,
        ],
      ),
    );

    return components.map(
      (component): IBookingComponent => {
        const componentId =
          component.componentId.toString();

        const componentDoc =
          componentMap.get(componentId);

        const serviceComponent =
          serviceComponentMap.get(componentId);

        const bookingComponent:
          IBookingComponent = {
          componentType:
            component.componentType,

          componentId:
            component.componentId,

          name:
            componentDoc?.name ??
            component.name,

          isRequired:
            serviceComponent?.isRequired ??
            false,

          isRemovable:
            componentDoc?.isRemovable ??
            false,

          isBundled:
            componentDoc?.isBundled ??
            false,

          selected: true,

          selectedItems:
            (component.items ?? []).map(
              (item) => ({
                itemId: item.itemId,
                name: item.name,
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
                tax: component.tax,
              }
              : {}),
          },
        };

        if (serviceComponent?._id) {
          bookingComponent.serviceComponentId =
            serviceComponent._id;
        }

        if (componentDoc?.description) {
          bookingComponent.description =
            componentDoc.description;
        }

        return bookingComponent;
      },
    );
  }
}