import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { Component } from "../models/component.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
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
        const components = await this.buildComponentSnapshots(cart, [
            ...(cart.selectedComponents ?? []).map((c) => ({
                ...c,
                componentType: "DEFAULT",
            })),
            ...(cart.addonComponents ?? []).map((c) => ({
                ...c,
                componentType: "ADDON",
            })),
        ], service._id);
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
                    taxes: 0,
                    grandTotal: cart.totalAmount,
                },
            },
        };
        return {
            entries: [entry],
            pricing: {
                taxes: 0,
                grandTotal: cart.totalAmount,
            },
        };
    }
    static async buildPackageBooking(cart) {
        const pkg = await Package.findById(cart.packageId).lean();
        if (!pkg) {
            throw new Error("Package not found");
        }
        const allServiceIds = [
            ...(cart.selectedServices ?? []).map((s) => s.serviceId),
            ...(cart.addonServices ?? []).map((s) => s.serviceId),
        ];
        const services = await Service.find({
            _id: { $in: allServiceIds },
        }).lean();
        const serviceMap = new Map(services.map((s) => [String(s._id), s]));
        const selectedServices = (cart.selectedServices ?? [])
            .map((selectedService) => {
            const service = serviceMap.get(String(selectedService.serviceId));
            if (!service)
                return null;
            return {
                serviceId: service._id,
                serviceSnapshot: {
                    name: service.name,
                    shortDescription: service.shortDescription,
                    thumbnailImage: service.thumbnailImage ?? "",
                    serviceReference: service.serviceReference,
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
                    taxes: 0,
                    grandTotal: selectedService.price,
                },
            };
        })
            .filter(Boolean);
        const addonServices = (cart.addonServices ?? [])
            .map((addon) => {
            const service = serviceMap.get(String(addon.serviceId));
            if (!service)
                return null;
            return {
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
                    taxes: 0,
                    grandTotal: addon.price,
                },
            };
        })
            .filter(Boolean);
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
                selectedServices,
                addonServices,
                pricing: {
                    taxes: 0,
                    grandTotal: cart.totalAmount,
                },
            },
        };
        return {
            entries: [entry],
            pricing: {
                taxes: 0,
                grandTotal: cart.totalAmount,
            },
        };
    }
    static async buildComponentSnapshots(cart, components, serviceId) {
        if (!components.length)
            return [];
        const componentIds = components.map((c) => c.componentId);
        const [componentDocs, serviceComponents, items] = await Promise.all([
            Component.find({ _id: { $in: componentIds } }).lean(),
            ServiceComponent.find({
                serviceId,
                tierId: cart.tierId,
                componentId: { $in: componentIds },
            }).lean(),
            ComponentItem.find({
                _id: {
                    $in: components.flatMap((c) => c.items.map((i) => i.itemId)),
                },
            }).lean(),
        ]);
        const componentMap = new Map(componentDocs.map((c) => [String(c._id), c]));
        const serviceComponentMap = new Map(serviceComponents.map((sc) => [String(sc.componentId), sc]));
        const itemPriceMap = new Map(items.map((i) => [String(i._id), i.price]));
        return components.map((component) => {
            const componentDoc = componentMap.get(String(component.componentId));
            const serviceComponent = serviceComponentMap.get(String(component.componentId));
            let itemPrice = 0;
            for (const item of component.items || []) {
                itemPrice += itemPriceMap.get(String(item.itemId)) || 0;
            }
            // const baseComponentPrice = serviceComponent?.isRequired ? 0 : 0;
            const baseComponentPrice = 0;
            const totalPrice = baseComponentPrice + itemPrice;
            const bookingComponent = {
                componentType: component.componentType,
                componentId: component.componentId,
                name: componentDoc?.name ?? component.name,
                isRequired: serviceComponent?.isRequired ?? false,
                isRemovable: componentDoc?.isRemovable ?? false,
                isBundled: componentDoc?.isBundled ?? false,
                selected: true,
                selectedItems: component.items.map((item) => ({
                    itemId: item.itemId,
                    name: item.name,
                })),
                pricing: {
                    total: totalPrice,
                },
            };
            if (serviceComponent?._id) {
                bookingComponent.serviceComponentId = serviceComponent._id;
            }
            if (componentDoc?.description) {
                bookingComponent.description = componentDoc.description;
            }
            return bookingComponent;
        });
    }
}
//# sourceMappingURL=booking.builder.js.map