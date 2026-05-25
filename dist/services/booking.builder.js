import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
export class BookingBuilder {
    static async buildFromCart(cart) {
        if (cart.serviceId) {
            return await this.buildServiceBooking(cart);
        }
        if (cart.packageId) {
            return await this.buildPackageBooking(cart);
        }
        throw new Error("Invalid cart type");
    }
    static async buildServiceBooking(cart) {
        const service = await Service.findById(cart.serviceId).lean();
        if (!service) {
            throw new Error("Service not found");
        }
        const components = [
            ...(cart.selectedComponents || []).map((c) => this.mapComponent(c, "DEFAULT")),
            ...(cart.addonComponents || []).map((c) => this.mapComponent(c, "ADDON")),
        ];
        const entry = {
            entryType: "SERVICE",
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
    static async buildPackageBooking(cart) {
        const pkg = await Package.findById(cart.packageId).lean();
        if (!pkg) {
            throw new Error("Package not found");
        }
        const addonServices = [];
        for (const addon of cart.addonServices || []) {
            const service = await Service.findById(addon.serviceId).lean();
            if (!service)
                continue;
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
        const entry = {
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
    static mapComponent(component, componentType) {
        const itemsTotal = (component.items || []).reduce((sum, item) => sum + (item.price || 0), 0);
        return {
            componentType,
            componentId: component.componentId,
            name: component.name,
            isRequired: componentType === "DEFAULT",
            isRemovable: componentType !== "DEFAULT",
            isBundled: false,
            selected: true,
            selectedItems: (component.items || []).map((item) => ({
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
//# sourceMappingURL=booking.builder.js.map