import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { Component } from "../models/component.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
export class BookingBuilder {
    static toPlainCart(cart) {
        const possibleDocument = cart;
        if (typeof possibleDocument.toObject === "function") {
            return possibleDocument.toObject();
        }
        return cart;
    }
    static validateCartType(cart) {
        const hasService = Boolean(cart.serviceId);
        const hasPackage = Boolean(cart.packageId);
        if (hasService === hasPackage) {
            throw new Error(hasService ? "Cart cannot contain both serviceId and packageId" : "Cart must contain either serviceId or packageId");
        }
        return hasService ? "SERVICE" : "PACKAGE";
    }
    static buildTaxSummary(taxSummary) {
        return {
            taxableAmount: taxSummary?.taxableAmount ?? 0,
            cgstAmount: taxSummary?.cgstAmount ?? 0,
            sgstAmount: taxSummary?.sgstAmount ?? 0,
            igstAmount: taxSummary?.igstAmount ?? 0,
            totalTax: taxSummary?.totalTax ?? 0,
            ...(taxSummary?.supplierStateCode ? { supplierStateCode: taxSummary.supplierStateCode } : {}), ...(taxSummary?.placeOfSupplyStateCode ? { placeOfSupplyStateCode: taxSummary.placeOfSupplyStateCode } : {}),
        };
    }
    static buildMainPricing(cart) {
        return {
            baseAmount: cart.basePrice,
            addonAmount: cart.addonPrice,
            subtotal: cart.subtotal,
            ...(cart.couponId && cart.couponCode ? { couponId: cart.couponId, couponCode: cart.couponCode } : {}),
            discountAmount: cart.discountAmount,
            // Copy finalized ADMIN commission snapshot from cart. Do NOT recalculate here.
            commissionPercentage: cart.commissionPercentage,
            commissionBaseAmount: cart.commissionBaseAmount,
            commissionAmount: cart.commissionAmount,
            // Final coordinator share
            coordinatorPayableAmount: cart.coordinatorPayableAmount,
            taxSummary: this.buildTaxSummary(cart.taxSummary),
            grandTotal: cart.totalAmount,
        };
    }
    static async buildFromCart(cart) {
        const cartType = this.validateCartType(cart);
        return cartType === "SERVICE" ? this.buildServiceBooking(cart) : this.buildPackageBooking(cart);
    }
    static async buildServiceBooking(cart) {
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
            ...(plainCart.selectedComponents ?? []).map((component) => ({ ...component, componentType: "DEFAULT" })),
            ...(plainCart.addonComponents ?? []).map((component) => ({ ...component, componentType: "ADDON" })),
        ];
        const components = await this.buildComponentSnapshots(selectedComponents, service._id, cart.tierId);
        // For direct SERVICE cart, selectedServices[0] represents the main service itself.
        const mainCartService = plainCart.selectedServices?.find((selectedService) => selectedService.serviceId.toString() === service._id.toString());
        const entry = {
            entryType: "SERVICE",
            serviceConfiguration: {
                serviceId: service._id,
                serviceSnapshot: {
                    name: service.name,
                    ...(service.shortDescription ? { shortDescription: service.shortDescription } : {}),
                    ...(service.thumbnailImage ? { thumbnailImage: service.thumbnailImage } : {}),
                    ...(service.serviceReference ? { serviceReference: service.serviceReference } : {}),
                },
                serviceRole: "PRIMARY",
                // Copy the cart snapshot. Do NOT query SubServiceComponent again.
                subServices: mainCartService?.subServices?.map((subService) => ({
                    subServiceId: subService.subServiceId,
                    name: subService.name,
                    description: subService.description,
                    ...(subService.image ? { image: subService.image } : {}),
                })) ?? [],
                tier: { tierId: cart.tierId, name: cart.tierName },
                location: { locationId: cart.locationId, name: cart.locationName },
                components,
                pricing: {
                    priceBeforeDiscount: cart.subtotal,
                    discountAmount: cart.discountAmount,
                    finalAmount: cart.totalAmount,
                    commissionPercentage: cart.commissionPercentage,
                    commissionAmount: cart.commissionAmount,
                    taxSummary: this.buildTaxSummary(cart.taxSummary),
                },
            },
        };
        return {
            entries: [entry],
            pricing: this.buildMainPricing(cart),
        };
    }
    static async buildPackageBooking(cart) {
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
        const services = allServiceIds.length > 0 ? await Service.find({ _id: { $in: allServiceIds } }).lean() : [];
        const serviceMap = new Map(services.map((service) => [service._id.toString(), service]));
        const selectedServices = [];
        for (const selectedService of selectedCartServices) {
            const service = serviceMap.get(selectedService.serviceId.toString());
            if (!service) {
                throw new Error(`Service not found: ${selectedService.serviceId.toString()}`);
            }
            selectedServices.push(this.buildPackageServiceConfiguration(cart, service, selectedService, "INCLUDED"));
        }
        const addonServices = [];
        for (const addonService of addonCartServices) {
            const service = serviceMap.get(addonService.serviceId.toString());
            if (!service) {
                throw new Error(`Addon service not found: ${addonService.serviceId.toString()}`);
            }
            addonServices.push(this.buildPackageServiceConfiguration(cart, service, addonService, "ADDON"));
        }
        const entry = {
            entryType: "PACKAGE",
            packageConfiguration: {
                packageId: packageDocument._id,
                packageSnapshot: {
                    name: packageDocument.name,
                    ...(packageDocument.shortDescription ? { shortDescription: packageDocument.shortDescription } : {}),
                    ...(packageDocument.thumbnailImage ? { thumbnailImage: packageDocument.thumbnailImage } : {}),
                    ...(packageDocument.packageReference ? { packageReference: packageDocument.packageReference } : {}),
                },
                selectedServices,
                addonServices,
                pricing: {
                    baseAmount: cart.basePrice,
                    addonAmount: cart.addonPrice,
                    subtotal: cart.subtotal,
                    discountAmount: cart.discountAmount,
                    commissionPercentage: cart.commissionPercentage,
                    commissionBaseAmount: cart.commissionBaseAmount,
                    commissionAmount: cart.commissionAmount,
                    coordinatorPayableAmount: cart.coordinatorPayableAmount,
                    taxSummary: this.buildTaxSummary(cart.taxSummary),
                    grandTotal: cart.totalAmount,
                },
            },
        };
        return { entries: [entry], pricing: this.buildMainPricing(cart) };
    }
    static buildPackageServiceConfiguration(cart, service, selectedService, serviceRole) {
        return {
            serviceId: service._id,
            serviceSnapshot: {
                name: service.name,
                ...(service.shortDescription ? { shortDescription: service.shortDescription } : {}),
                ...(service.thumbnailImage ? { thumbnailImage: service.thumbnailImage } : {}),
                ...(service.serviceReference ? { serviceReference: service.serviceReference } : {}),
            },
            serviceRole,
            // Copy all service steps directly from cart snapshot.
            subServices: selectedService.subServices?.map((subService) => ({
                subServiceId: subService.subServiceId,
                name: subService.name,
                description: subService.description,
                ...(subService.image ? { image: subService.image } : {}),
            })) ?? [],
            tier: { tierId: cart.tierId, name: cart.tierName },
            location: { locationId: cart.locationId, name: cart.locationName },
            components: [],
            pricing: {
                priceBeforeDiscount: selectedService.priceBeforeDiscount,
                discountAmount: selectedService.discountAmount,
                finalAmount: selectedService.price,
                commissionPercentage: selectedService.commissionPercentage,
                commissionAmount: selectedService.commissionAmount,
                ...(selectedService.tax ? { tax: selectedService.tax } : {}),
                taxSummary: this.buildTaxSummaryFromLine(selectedService.tax),
            },
        };
    }
    static buildTaxSummaryFromLine(tax) {
        if (!tax) {
            return { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 };
        }
        return { taxableAmount: tax.taxableAmount, cgstAmount: tax.cgstAmount, sgstAmount: tax.sgstAmount, igstAmount: tax.igstAmount, totalTax: tax.totalTax };
    }
    static async buildComponentSnapshots(components, serviceId, tierId) {
        if (components.length === 0) {
            return [];
        }
        const componentIds = components.map((component) => component.componentId);
        const [componentDocs, serviceComponents] = await Promise.all([Component.find({ _id: { $in: componentIds } }).lean(),
            ServiceComponent.find({ serviceId, tierId, componentId: { $in: componentIds } }).lean(),
        ]);
        const componentMap = new Map(componentDocs.map((component) => [component._id.toString(), component]));
        const serviceComponentMap = new Map(serviceComponents.map((serviceComponent) => [serviceComponent.componentId.toString(), serviceComponent]));
        return components.map((component) => {
            const componentId = component.componentId.toString();
            const componentDocument = componentMap.get(componentId);
            const serviceComponent = serviceComponentMap.get(componentId);
            const bookingComponent = {
                componentType: component.componentType,
                componentId: component.componentId,
                name: componentDocument?.name ?? component.name,
                isRequired: serviceComponent?.isRequired ?? false,
                isRemovable: componentDocument?.isRemovable ?? false,
                isBundled: componentDocument?.isBundled ?? false,
                selected: true,
                selectedItems: (component.items ?? []).map((item) => ({ itemId: item.itemId, name: item.name })),
                pricing: {
                    priceBeforeDiscount: component.priceBeforeDiscount,
                    discountAmount: component.discountAmount,
                    finalAmount: component.totalPrice,
                    ...(component.tax ? { tax: component.tax } : {}),
                },
            };
            if (serviceComponent?._id) {
                bookingComponent.serviceComponentId = serviceComponent._id;
            }
            if (componentDocument?.description) {
                bookingComponent.description = componentDocument.description;
            }
            if (componentDocument?.imageUrl) {
                bookingComponent.imageUrl = componentDocument.imageUrl;
            }
            return bookingComponent;
        });
    }
}
//# sourceMappingURL=booking.builder.js.map