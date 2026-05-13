import mongoose, {} from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Component } from "../models/component.model.js";
import { Service } from "../models/service.model.js";
import { SubServiceComponent } from "../models/subservices.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { Tier } from "../models/tier.model.js";
import { Location } from "../models/location.model.js";
import { Booking } from "../models/booking.model.js";
import { Package } from "../models/package.model.js";
export class CartService {
    async createCart(payload) {
        try {
            const cartData = {
                cartType: payload.cartType || "SERVICE",
                scheduledAt: payload.scheduledAt,
                entries: [],
                pricing: {
                    subtotal: 0,
                    taxes: 0,
                    discount: 0,
                    grandTotal: 0,
                    calculatedAt: new Date(),
                },
                validation: {
                    isValid: true,
                    hasPricingChanged: false,
                    unavailableServices: false,
                    unavailableComponents: false,
                    errors: [],
                    lastValidatedAt: new Date(),
                },
                status: "ACTIVE",
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            };
            if (payload.userId) {
                cartData.userId = new mongoose.Types.ObjectId(payload.userId);
            }
            const cart = await Cart.create(cartData);
            return cart;
        }
        catch (error) {
            throw new Error(error.message || "Failed to create cart");
        }
    }
    async addServiceEntry(cartId, payload) {
        try {
            const { serviceId, tierId, locationId, subServiceId } = payload;
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            if (cart.status !== "ACTIVE") {
                throw new Error("Cart is not active");
            }
            const service = await Service.findOne({
                _id: serviceId,
                isActive: true,
                isComplete: true,
            });
            if (!service) {
                throw new Error("Service not found");
            }
            const tier = await Tier.findById(tierId);
            if (!tier) {
                throw new Error("Tier not found");
            }
            const location = await Location.findById(locationId);
            if (!location) {
                throw new Error("Location not found");
            }
            let subService = null;
            if (subServiceId) {
                subService = await SubServiceComponent.findById(subServiceId);
                if (!subService) {
                    throw new Error("Sub service not found");
                }
            }
            const serviceComponents = await ServiceComponent.find({
                serviceId,
                tierId,
            }).populate("componentId");
            const pricingList = await ServicePricing.find({
                serviceId,
                tierId,
                locationId,
            });
            const pricingMap = new Map();
            pricingList.forEach((pricing) => {
                pricingMap.set(pricing.componentId.toString(), pricing);
            });
            let subtotal = 0;
            const components = serviceComponents.map((serviceComponent) => {
                const component = serviceComponent.componentId;
                const pricing = pricingMap.get(component._id.toString());
                const basePrice = pricing?.price || 0;
                subtotal += basePrice;
                return {
                    componentType: "DEFAULT",
                    serviceComponentId: serviceComponent._id,
                    componentId: component._id,
                    name: serviceComponent.name,
                    description: serviceComponent.description,
                    isRequired: serviceComponent.isRequired,
                    isRemovable: component.isRemovable,
                    isBundled: component.isBundled,
                    selected: serviceComponent.isRequired,
                    selectedItems: [],
                    pricing: {
                        basePrice,
                        itemsTotal: 0,
                        total: basePrice,
                    },
                };
            });
            const entry = {
                entryType: "SERVICE",
                entryId: new mongoose.Types.ObjectId(),
                serviceConfiguration: {
                    serviceId: service._id,
                    serviceSnapshot: {
                        name: service.name,
                        shortDescription: service.shortDescription,
                        thumbnailImage: service.thumbnailImage,
                        serviceReference: service.serviceReference,
                    },
                    serviceRole: "PRIMARY",
                    subService: subService
                        ? {
                            subServiceId: subService._id,
                            name: subService.name,
                        }
                        : undefined,
                    tier: {
                        tierId: tier._id,
                        name: tier.name,
                    },
                    location: {
                        locationId: location._id,
                        name: location.name,
                    },
                    components,
                    pricing: {
                        subtotal,
                        taxes: 0,
                        discount: 0,
                        grandTotal: subtotal,
                    },
                },
            };
            cart.entries.push(entry);
            let cartSubtotal = 0;
            cart.entries.forEach((entry) => {
                if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                    cartSubtotal += entry.serviceConfiguration.pricing.grandTotal;
                }
                if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                    cartSubtotal += entry.packageConfiguration.pricing.grandTotal;
                }
            });
            cart.pricing = {
                subtotal: cartSubtotal,
                taxes: 0,
                discount: 0,
                grandTotal: cartSubtotal,
                calculatedAt: new Date(),
            };
            await cart.save();
            return entry;
        }
        catch (error) {
            throw new Error(error.message || "Failed to add service entry");
        }
    }
    async recalculateCart(cartId, session) {
        try {
            const cart = await Cart.findById(cartId).session(session || null);
            if (!cart) {
                throw new Error("Cart not found");
            }
            let cartSubtotal = 0;
            for (const entry of cart.entries) {
                if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                    const serviceConfig = entry.serviceConfiguration;
                    let serviceSubtotal = 0;
                    for (const component of serviceConfig.components) {
                        if (!component.selected && !component.isRequired) {
                            component.pricing = {
                                basePrice: 0,
                                itemsTotal: 0,
                                total: 0,
                            };
                            continue;
                        }
                        const livePricing = await ServicePricing.findOne({
                            serviceId: serviceConfig.serviceId,
                            componentId: component.componentId,
                            tierId: serviceConfig.tier.tierId,
                            locationId: serviceConfig.location.locationId,
                        }).session(session || null);
                        const basePrice = livePricing?.price || 0;
                        let itemsTotal = 0;
                        if (component.selectedItems?.length) {
                            itemsTotal = component.selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
                        }
                        const total = basePrice + itemsTotal;
                        component.pricing = {
                            basePrice,
                            itemsTotal,
                            total,
                        };
                        serviceSubtotal += total;
                    }
                    serviceConfig.pricing = {
                        subtotal: serviceSubtotal,
                        taxes: 0,
                        discount: 0,
                        grandTotal: serviceSubtotal,
                    };
                    cartSubtotal += serviceSubtotal;
                }
                if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                    const packageConfig = entry.packageConfiguration;
                    let packageSubTotal = 0;
                    for (const serviceConfig of packageConfig.services) {
                        let serviceSubtotal = 0;
                        for (const component of serviceConfig.components) {
                            if (!component.selected && !component.isRequired) {
                                component.pricing = {
                                    basePrice: 0,
                                    itemsTotal: 0,
                                    total: 0,
                                };
                                continue;
                            }
                            const livePricing = await ServicePricing.findOne({
                                serviceId: serviceConfig.serviceId,
                                componentId: component.componentId,
                                tierId: serviceConfig.tier.tierId,
                                locationId: serviceConfig.location.locationId,
                            }).session(session || null);
                            const basePrice = livePricing?.price || 0;
                            const itemsTotal = component.selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
                            const total = basePrice + itemsTotal;
                            component.pricing = {
                                basePrice,
                                itemsTotal,
                                total,
                            };
                            serviceSubtotal += total;
                        }
                        serviceConfig.pricing = {
                            subtotal: serviceSubtotal,
                            taxes: 0,
                            discount: 0,
                            grandTotal: serviceSubtotal,
                        };
                        packageSubTotal += serviceSubtotal;
                    }
                    // Add on services
                    for (const serviceConfig of packageConfig.addonServices) {
                        let serviceSubtotal = 0;
                        for (const component of serviceConfig.components) {
                            if (!component.selected && !component.isRequired) {
                                component.pricing = {
                                    basePrice: 0,
                                    itemsTotal: 0,
                                    total: 0,
                                };
                                continue;
                            }
                            const livePricing = await ServicePricing.findOne({
                                serviceId: serviceConfig.serviceId,
                                componentId: component.componentId,
                                tierId: serviceConfig.tier.tierId,
                                locationId: serviceConfig.location.locationId,
                            }).session(session || null);
                            const basePrice = livePricing?.price || 0;
                            const itemsTotal = component.selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
                            const total = basePrice + itemsTotal;
                            component.pricing = {
                                basePrice,
                                itemsTotal,
                                total,
                            };
                            serviceSubtotal += total;
                        }
                        serviceConfig.pricing = {
                            subtotal: serviceSubtotal,
                            taxes: 0,
                            discount: 0,
                            grandTotal: serviceSubtotal,
                        };
                        packageSubTotal += serviceSubtotal;
                    }
                    packageConfig.pricing = {
                        subtotal: packageSubTotal,
                        taxes: 0,
                        discount: 0,
                        grandTotal: packageSubTotal,
                    };
                    cartSubtotal += packageSubTotal;
                }
            }
            cart.pricing = {
                subtotal: cartSubtotal,
                taxes: 0,
                discount: 0,
                grandTotal: cartSubtotal,
                calculatedAt: new Date(),
            };
            await cart.save({ session: session || null });
            return cart;
        }
        catch (error) {
            throw new Error(error.message || "Falied to recalculate cart");
        }
    }
    async updateComponent(cartId, entryId, componentId, payload) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            let components = [];
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                components = entry.serviceConfiguration.components;
            }
            if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                const allServices = [
                    ...entry.packageConfiguration.services,
                    ...entry.packageConfiguration.addonServices,
                ];
                for (const service of allServices) {
                    const foundComponent = service.components.find((component) => component.componentId.toString() === componentId);
                    if (foundComponent) {
                        components = service.components;
                        break;
                    }
                }
            }
            const component = components.find((component) => component.componentId.toString() === componentId);
            if (!component) {
                throw new Error("Component not found");
            }
            if (component.isRequired && payload.selected === false) {
                throw new Error("Required component cannot be unselected");
            }
            if (typeof payload.selected === "boolean") {
                component.selected = payload.selected;
            }
            await cart.save();
            await this.recalculateCart(cartId);
        }
        catch (error) {
            throw new Error(error.message || "Falied to update component");
        }
    }
    async updateComponentItems(cartId, entryId, componentId, selectedItemsPayload) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            let component = null;
            let serviceComponent = null;
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                component = entry.serviceConfiguration.components.find((component) => component.componentId.toString() === componentId);
            }
            if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                const allServices = {
                    ...entry.packageConfiguration.services,
                    ...entry.packageConfiguration.addonServices,
                };
                for (const service of allServices) {
                    const foundComponent = service.components.find((component) => component.componentId.toString() === componentId);
                    if (foundComponent) {
                        component = foundComponent;
                        break;
                    }
                }
            }
            if (!component) {
                throw new Error("Component not found");
            }
            if (!component.selected) {
                throw new Error("Cannot update items for unselected component");
            }
            if (!component.serviceComponentId) {
                throw new Error("Service component reference missing");
            }
            serviceComponent = await ServiceComponent.findById(component.serviceComponentId);
            if (!serviceComponent) {
                throw new Error("Original service component not found");
            }
            const allowedItemIds = new Set(serviceComponent.items.map((item) => item.itemId.toString()));
            for (const selectedItem of selectedItemsPayload) {
                if (!allowedItemIds.has(selectedItem.itemId)) {
                    throw new Error(`Invalid component item: ${selectedItem.itemId}`);
                }
            }
            const itemIds = selectedItemsPayload.map((item) => item.itemId);
            const items = await ComponentItem.find({
                _id: { $in: itemIds },
                isActive: true,
            });
            const itemMap = new Map();
            items.forEach((item) => {
                itemMap.set(item._id.toString(), item);
            });
            const selectedItems = selectedItemsPayload.map((payloadItem) => {
                const item = itemMap.get(payloadItem.itemId);
                if (!item) {
                    throw new Error(`Component item not found: ${payloadItem.itemId}`);
                }
                return {
                    itemId: item._id,
                    name: item.name,
                    price: item.price || 0,
                };
            });
            component.selectedItems = selectedItems;
            await cart.save();
            await this.recalculateCart(cartId);
            return component;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update component items");
        }
    }
    async addAddonComponent(cartId, entryId, payload) {
        try {
            const { componentId } = payload;
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            let serviceConfig = null;
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                serviceConfig = entry.serviceConfiguration;
            }
            if (!serviceConfig) {
                throw new Error("Addon component currently supported only for SERVICE entries");
            }
            const existingComponent = serviceConfig.components.find((component) => component.componentId.toString() === componentId);
            if (existingComponent) {
                throw new Error("Component already exists in cart");
            }
            const component = await Component.findOne({
                _id: componentId,
                isActive: true,
            });
            if (!component) {
                throw new Error("Component not found");
            }
            const pricing = await ServicePricing.findOne({
                serviceId: serviceConfig.serviceId,
                componentId: component._id,
                tierId: serviceConfig.tier.tierId,
                locationId: serviceConfig.location.locationId,
            });
            const basePrice = pricing?.price || 0;
            const addonComponent = {
                componentType: "ADDON",
                serviceComponentId: undefined,
                componentId: component._id,
                name: component.name,
                description: component.description,
                isRequired: false,
                isRemovable: true,
                isBundled: false,
                selected: true,
                selectedItems: [],
                pricing: {
                    basePrice: 0,
                    itemsTotal: 0,
                    total: basePrice,
                },
            };
            serviceConfig.components.push(addonComponent);
            await cart.save();
            await this.recalculateCart(cartId);
            return addonComponent;
        }
        catch (error) {
            throw new Error(error.message || "Failed to add addon component");
        }
    }
    async removeAddonComponent(cartId, entryId, componentId) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            let serviceConfig = null;
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                serviceConfig = entry.serviceConfiguration;
            }
            if (!serviceConfig) {
                throw new Error("Addon component removal currently supported only for SERVICE entries");
            }
            const componentIndex = serviceConfig.components.findIndex((component) => component.componentId.toString() === componentId);
            if (componentIndex === -1) {
                throw new Error("Component not found");
            }
            const component = serviceConfig.components[componentIndex];
            if (component.componentType !== "ADDON") {
                throw new Error("Only addon components can be removed");
            }
            serviceConfig.components.splice(componentIndex, 1);
            await cart.save();
            await this.recalculateCart(cartId);
            return {
                success: true,
                removedComponentId: componentId,
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to remove addon component");
        }
    }
    async addAddonService(cartId, entryId, payload) {
        try {
            const { serviceId, tierId, locationId, subServiceId } = payload;
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            if (entry.entryType !== "PACKAGE" || !entry.packageConfiguration) {
                throw new Error("Addon services only supported for package entries");
            }
            const packageConfig = entry.packageConfiguration;
            const alreadyExists = [
                ...packageConfig.services,
                ...packageConfig.addonServices,
            ].find((service) => service.serviceId.toString() === serviceId);
            if (alreadyExists) {
                throw new Error("Service already exists in package");
            }
            const service = await Service.findOne({
                _id: serviceId,
                isActive: true,
                isComplete: true,
            });
            if (!service) {
                throw new Error("Service not found");
            }
            const tier = service.tiers.find((tier) => tier.tierId.toString() === tierId);
            if (!tier) {
                throw new Error("Tier not available for service");
            }
            const location = service.locations.find((location) => location.locationId.toString() === locationId);
            if (!location) {
                throw new Error("Location not available for service");
            }
            const serviceComponents = await ServiceComponent.find({
                serviceId,
                tierId,
            });
            const components = await Promise.all(serviceComponents.map(async (serviceComponent) => {
                const pricing = await ServicePricing.findOne({
                    serviceId,
                    componentId: serviceComponent.componentId,
                    tierId,
                    locationId,
                });
                const basePrice = pricing?.price || 0;
                return {
                    componentType: "DEFAULT",
                    serviceComponentId: serviceComponent._id,
                    componentId: serviceComponent.componentId,
                    name: serviceComponent.name,
                    description: serviceComponent.description,
                    isRequired: serviceComponent.isRequired,
                    isRemovable: true,
                    isBundled: true,
                    selected: serviceComponent.isRequired,
                    selectedItems: [],
                    pricing: {
                        basePrice,
                        itemsTotal: 0,
                        total: serviceComponent.isRequired ? basePrice : 0,
                    },
                };
            }));
            const addonService = {
                serviceId: service._id,
                serviceSnapshot: {
                    name: service.name,
                    shortDescription: service.shortDescription,
                    thumbnailImage: service.thumbnailImage,
                    serviceReference: service.serviceReference,
                },
                serviceRole: "ADDON",
                subService: subServiceId ? { subServiceId } : undefined,
                tier: {
                    tierId,
                    name: tier.name,
                },
                location: {
                    locationId,
                    name: location.name,
                },
                components,
                pricing: {
                    subtotal: 0,
                    taxes: 0,
                    discount: 0,
                    grandTotal: 0,
                },
            };
            packageConfig.addonService.push(addonService);
            await cart.save();
            await this.recalculateCart(cartId);
            return addonService;
        }
        catch (error) {
            throw new Error(error.message || "Failed to add addon service");
        }
    }
    async removeAddonService(cartId, entryId, serviceId) {
        try {
            const cart = await Cart.findById(cartId);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            if (entry.entryType !== "PACKAGE" || !entry.packageConfiguration) {
                throw new Error("Addon service removal only supported for package entries");
            }
            const packageConfig = entry.packageConfiguration;
            const addonServiceIndex = packageConfig.addonServices.findIndex((service) => service.serviceId.toString() === serviceId);
            if (addonServiceIndex === -1) {
                throw new Error("Addon service not found");
            }
            const addonService = packageConfig.addonServices[addonServiceIndex];
            if (addonService.serviceRole !== "ADDON") {
                throw new Error("Only addon services can be removed");
            }
            packageConfig.addonServices.splice(addonServiceIndex, 1);
            await cart.save();
            await this.recalculateCart(cartId);
            return {
                success: true,
                removeServiceId: serviceId,
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to remove addon service");
        }
    }
    async validateCart(cartId, session) {
        try {
            const cart = await Cart.findById(cartId).session(session || null);
            if (!cart) {
                throw new Error("Cart not found");
            }
            const errors = [];
            let isValid = true;
            let hasPricingChanged = false;
            let unavailableServices = false;
            let unavailableComponents = false;
            for (const entry of cart.entries) {
                if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                    const result = await this.validateServiceConfiguration(entry.serviceConfiguration, session);
                    if (!result.isValid) {
                        isValid = false;
                    }
                    if (result.hasPricingChanged) {
                        hasPricingChanged = true;
                    }
                    if (result.unavailableServices) {
                        unavailableServices = true;
                    }
                    if (result.unavailableComponents) {
                        unavailableComponents = true;
                    }
                    errors.push(...result.errors);
                }
                if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                    const allServices = [
                        ...entry.packageConfiguration.services,
                        ...entry.packageConfiguration.addonServices,
                    ];
                    for (const serviceConfig of allServices) {
                        const result = await this.validateServiceConfiguration(entry.serviceConfiguration, session);
                        if (!result.isValid) {
                            isValid = false;
                        }
                        if (result.hasPricingChanged) {
                            hasPricingChanged = true;
                        }
                        if (result.unavailableServices) {
                            unavailableServices = true;
                        }
                        if (result.unavailableComponents) {
                            unavailableComponents = true;
                        }
                        errors.push(...result.errors);
                    }
                }
            }
            cart.validation = {
                isValid,
                hasPricingChanged,
                unavailableServices,
                unavailableComponents,
                errors,
                lastValidatedAt: new Date(),
            };
            await cart.save();
            return cart.validation;
        }
        catch (error) {
            throw new Error(error.message || "Failed to validate cart");
        }
    }
    async validateServiceConfiguration(serviceConfig, session) {
        const errors = [];
        let isValid = true;
        let hasPricingChanged = false;
        let unavailableServices = false;
        let unavailableComponents = false;
        const service = await Service.findOne({
            _id: serviceConfig.serviceId,
            isActive: true,
            isComplete: true,
        })
            .session(session || null)
            .lean();
        if (!service) {
            return {
                isValid: false,
                hasPricingChanged: false,
                unavailableServices: true,
                unavailableComponents: false,
                errors: [`Service unavailable: ${serviceConfig.serviceSnapshot.name}`],
            };
        }
        const tierExists = service.tiers.some((tier) => tier.tierId.toString() === serviceConfig.tier.tierId.toString());
        if (!tierExists) {
            isValid = false;
            errors.push(`Tier unavailable for service: ${service.name}`);
        }
        const locationExists = service.locations.some((location) => location.locationId.toString() ===
            serviceConfig.location.locationId.toString());
        if (!locationExists) {
            isValid = false;
            errors.push(`Location unavailable for service: ${service.name}`);
        }
        const componentIds = serviceConfig.components.map((component) => component.componentId);
        const components = await Component.find({
            _id: { $in: componentIds },
            isActive: true,
        }).session(session || null);
        const componentMap = new Map(components.map((component) => [component._id.toString(), component]));
        const pricingDocs = await ServicePricing.find({
            serviceId: serviceConfig.serviceId,
            tierId: serviceConfig.tier.tierId,
            locationId: serviceConfig.location.locationId,
            componentId: { $in: componentIds },
        }).session(session || null);
        const pricingMap = new Map(pricingDocs.map((pricing) => [
            pricing.componentId.toString(),
            pricing,
        ]));
        for (const component of serviceConfig.components) {
            const componentId = component.componentId.toString();
            const liveComponent = componentMap.get(componentId);
            if (!liveComponent) {
                isValid = false;
                unavailableComponents = true;
                errors.push(`Component unavailable: ${component.name}`);
                continue;
            }
            const livePricing = pricingMap.get(componentId);
            if (!livePricing) {
                isValid = false;
                errors.push(`Pricing unavailable for component: ${component.name}`);
                continue;
            }
            if (component.pricing.basePrice !== livePricing.price) {
                hasPricingChanged = true;
                errors.push(`Pricing changed for component: ${component.name}`);
            }
        }
        return {
            isValid,
            hasPricingChanged,
            unavailableServices,
            unavailableComponents,
            errors,
        };
    }
    async prepareCheckout(cartId, userId, session) {
        try {
            let cart = await Cart.findOne({
                _id: cartId,
                userId,
            }).session(session || null);
            if (!cart) {
                throw new Error("Cart not found");
            }
            if (cart.status !== "ACTIVE") {
                throw new Error(`Cart is ${cart.status.toLowerCase()}`);
            }
            if (!cart.entries || cart.entries.length === 0) {
                throw new Error("Cart is empty");
            }
            const validation = await this.validateCart(cartId, session);
            if (!validation.isValid) {
                throw new Error("Cart contains unavailable items");
            }
            await this.recalculateCart(cartId, session);
            cart = await Cart.findById(cartId).session(session || null);
            if (!cart) {
                throw new Error("Failed to reload cart");
            }
            const checkoutSummary = {
                cartId: cart._id,
                cartType: cart.cartType,
                entriesCount: cart.entries.length,
                pricing: cart.pricing,
                validation: cart.validation,
                customerDetails: cart.customerDetails,
                scheduledAt: cart.scheduledAt,
                notes: cart.notes,
                readyForCheckout: true,
                preparedAt: new Date(),
            };
            return checkoutSummary;
        }
        catch (error) {
            throw new Error(error.message || "Failed to preapre checkout");
        }
    }
    async checkoutCart(cartId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let cart = await Cart.findOne({
                _id: cartId,
                userId,
            }).session(session);
            if (!cart) {
                throw new Error("Cart not found");
            }
            if (cart.status !== "ACTIVE") {
                throw new Error(`Cart already ${cart.status.toLowerCase()}`);
            }
            await this.prepareCheckout(cartId, userId, session);
            cart = await Cart.findById(cartId).session(session);
            if (!cart) {
                throw new Error("Failed to reload cart");
            }
            const bookingEntries = cart.entries.map((entry) => ({
                entryType: entry.entryType,
                entryId: entry.entryId,
                serviceConfiguration: entry.serviceConfiguration,
                packageConfiguration: entry.packageConfiguration,
            }));
            const bookingPayload = {
                cartId: cart._id,
                bookedBy: "CUSTOMER",
                entries: bookingEntries,
                cartSnapshot: cart.toObject(),
                customerDetails: cart.customerDetails,
                pricing: {
                    subtotal: cart.pricing.subtotal,
                    taxes: cart.pricing.taxes,
                    discount: cart.pricing.discount,
                    grandTotal: cart.pricing.grandTotal,
                },
                payment: {
                    status: "PENDING",
                },
                ...(cart.scheduledAt && {
                    scheduledAt: cart.scheduledAt,
                }),
                ...(cart.notes && {
                    notes: cart.notes,
                }),
                status: "PENDING",
            };
            if (cart.userId) {
                bookingPayload.userId = cart.userId;
            }
            const booking = await Booking.create([bookingPayload], {
                session,
            });
            cart.status = "CHECKED_OUT";
            await cart.save({ session });
            await session.commitTransaction();
            return {
                success: true,
                booking: booking[0],
                paymentRequired: true,
            };
        }
        catch (error) {
            await session.abortTransaction();
            console.error("CartService.checkoutCart error:", error);
            throw new Error(error.message || "Checkout failed");
        }
        finally {
            await session.endSession();
        }
    }
    async deleteCart(cartId, userId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            cart.status = "ABANDONED";
            await cart.save();
            return {
                success: true,
            };
        }
        catch (error) {
            console.error("CartService.deleteCart error:", error);
            throw new Error(error.message || "Failed to delete cart");
        }
    }
    async updateCart(cartId, userId, payload) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            if (payload.customerDetails) {
                cart.customerDetails = {
                    ...cart.customerDetails,
                    ...payload.customerDetails,
                };
            }
            if (payload.scheduledAt) {
                cart.scheduledAt = payload.scheduledAt;
            }
            if (payload.notes !== undefined) {
                cart.notes = payload.notes;
            }
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error("CartService.updateCart error:", error);
            throw new Error(error.message || "Failed to update cart");
        }
    }
    async getCartById(cartId, userId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            return cart;
        }
        catch (error) {
            console.error("CartService.getCartById error:", error);
            throw new Error(error.message || "Failed to fetch cart");
        }
    }
    async clearCartEntries(cartId, userId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            cart.entries = [];
            cart.pricing = {
                subtotal: 0,
                taxes: 0,
                discount: 0,
                grandTotal: 0,
                calculatedAt: new Date(),
            };
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error("CartService.clearCartEntries error:", error);
            throw new Error(error.message || "Failed to clear cart");
        }
    }
    async getEntryById(cartId, entryId, userId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            return entry;
        }
        catch (error) {
            console.error("CartService.getEntryById error:", error);
            throw new Error(error.message || "Failed to fetch entry");
        }
    }
    async buildServiceConfiguration(payload) {
        const { serviceId, tierId, locationId, subServiceId, serviceRole = "PRIMARY", } = payload;
        const service = await Service.findOne({
            _id: serviceId,
            isActive: true,
            isComplete: true,
        });
        if (!service) {
            throw new Error("Service not found");
        }
        const serviceComponents = await ServiceComponent.find({
            serviceId,
            tierId,
        });
        const components = [];
        for (const component of serviceComponents) {
            const pricing = await ServicePricing.findOne({
                serviceId,
                componentId: component.componentId,
                tierId,
                locationId,
            });
            components.push({
                componentType: "DEFAULT",
                serviceComponentId: component._id,
                componentId: component.componentId,
                name: component.name,
                description: component.description,
                isRequired: component.isRequired,
                isRemovable: !component.isRequired,
                isBundled: true,
                selected: component.isRequired,
                selectedItems: [],
                pricing: {
                    basePrice: pricing?.price || 0,
                    itemsTotal: 0,
                    total: pricing?.price || 0,
                },
            });
        }
        const subtotal = components.reduce((sum, component) => sum + component.pricing.total, 0);
        return {
            serviceId: service._id,
            serviceSnapshot: {
                name: service.name,
                shortDescription: service.shortDescription,
                thumbnailImage: service.thumbnailImage,
                serviceReference: service.serviceReference,
            },
            serviceRole,
            subService: subServiceId
                ? {
                    subServiceId,
                }
                : undefined,
            tier: {
                tierId,
                name: service.tiers.find((tier) => tier.tierId.toString() === tierId)
                    ?.name || "",
            },
            location: {
                locationId,
                name: service.locations.find((location) => location.locationId.toString() === locationId)?.name || "",
            },
            components,
            pricing: {
                subtotal,
                taxes: 0,
                discount: 0,
                grandTotal: subtotal,
            },
        };
    }
    async addPackageEntry(cartId, userId, payload) {
        try {
            const { packageId } = payload;
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
                status: "ACTIVE",
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const packageDoc = await Package.findOne({
                _id: packageId,
                isActive: true,
            });
            if (!packageDoc) {
                throw new Error("Package not found");
            }
            const services = [];
            for (const packageService of packageDoc.services) {
                const selectedService = payload.services.find((service) => service.serviceId === packageService.serviceId.toString());
                if (!selectedService) {
                    throw new Error(`Missing configuration for service ${packageService.name}`);
                }
                const tierId = selectedService.tierId || packageService.defaultTierId?.toString();
                if (!tierId) {
                    throw new Error(`Tier is required for service ${packageService.name}`);
                }
                const serviceConfig = await this.buildServiceConfiguration({
                    serviceId: packageService.serviceId.toString(),
                    tierId,
                    locationId: selectedService.locationId,
                    ...(selectedService.subServiceId && {
                        subServiceId: selectedService.subServiceId,
                    }),
                    serviceRole: "INCLUDED",
                });
                services.push(serviceConfig);
            }
            const subtotal = services.reduce((sum, service) => sum + service.pricing.grandTotal, 0);
            const entry = {
                entryType: "PACKAGE",
                entryId: new mongoose.Types.ObjectId(),
                packageConfiguration: {
                    packageId: packageDoc._id,
                    packageSnapshot: {
                        name: packageDoc.name,
                        description: packageDoc.description,
                        image: packageDoc.image,
                        packageReference: packageDoc.packageReference,
                    },
                    services,
                    addonServices: [],
                    pricing: {
                        subtotal,
                        taxes: 0,
                        discount: 0,
                        grandTotal: subtotal,
                    },
                },
            };
            cart.entries.push(entry);
            if (cart.cartType === "SERVICE") {
                cart.cartType = "MIXED";
            }
            else {
                cart.cartType = "PACKAGE";
            }
            await cart.save();
            await this.recalculateCart(cart._id.toString());
            return cart;
        }
        catch (error) {
            throw new Error(error.message || "Failed to add package entry");
        }
    }
    resolveCartType(entries) {
        const hasServices = entries.some((entry) => entry.entryType === "SERVICE");
        const hasPackages = entries.some((entry) => entry.entryType === "PACKAGE");
        if (hasServices && hasPackages) {
            return "MIXED";
        }
        if (hasPackages) {
            return "PACKAGE";
        }
        return "SERVICE";
    }
    async removeEntry(cartId, entryId, userId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
                status: "ACTIVE",
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entryIndex = cart.entries.findIndex((entry) => entry.entryId.toString() === entryId);
            if (entryIndex === -1) {
                throw new Error("Entry not found");
            }
            const removedEntry = cart.entries[entryIndex];
            cart.entries.splice(entryIndex, 1);
            cart.cartType = this.resolveCartType(cart.entries);
            await cart.save();
            await this.recalculateCart(cart._id.toString());
            return {
                success: true,
                removedEntryId: entryId,
                removedEntryType: removedEntry.entryType,
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to remove entry");
        }
    }
    async updateEntry(cartId, entryId, userId, payload) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
                status: "ACTIVE",
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            if (entry.entryType !== "SERVICE" || !entry.serviceConfiguration) {
                throw new Error("Only service entries can be updated");
            }
            const existingConfig = entry.serviceConfiguration;
            const tierId = payload.tierId || existingConfig.tier.tierId.toString();
            const locationId = payload.locationId || existingConfig.location.locationId.toString();
            const subServiceId = payload.subServiceId ||
                existingConfig.subService?.subServiceId?.toString();
            const rebuiltConfiguration = await this.buildServiceConfiguration({
                serviceId: existingConfig.serviceId.toString(),
                tierId,
                locationId,
                subServiceId,
                serviceRole: existingConfig.serviceRole,
            });
            entry.serviceConfiguration = rebuiltConfiguration;
            await cart.save();
            await this.recalculateCart(cart._id.toString());
            return cart;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update entry");
        }
    }
    async getEntryComponents(cartId, entryId, userId, serviceId) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            if (entry.entryType === "SERVICE" && entry.serviceConfiguration) {
                return {
                    serviceId: entry.serviceConfiguration.serviceId,
                    serviceName: entry.serviceConfiguration.serviceSnapshot.name,
                    serviceRole: entry.serviceConfiguration.serviceRole,
                    components: entry.serviceConfiguration.components,
                };
            }
            if (entry.entryType === "PACKAGE" && entry.packageConfiguration) {
                if (!serviceId) {
                    throw new Error("serviceId is required for package entries");
                }
                const allServices = [
                    ...entry.packageConfiguration.services,
                    ...entry.packageConfiguration.addonServices,
                ];
                const targetService = allServices.find((service) => service.serviceId.toString() === serviceId);
                if (!targetService) {
                    throw new Error("Service not found in package");
                }
                return {
                    serviceId: targetService.serviceId,
                    serviceName: targetService.serviceSnapshot.name,
                    serviceRole: targetService.serviceRole,
                    components: targetService.components,
                };
            }
            throw new Error("Unsupported entry type");
        }
        catch (error) {
            throw new Error(error.message || "Failed to fetch components");
        }
    }
    async updateIncludedService(cartId, entryId, serviceId, userId, payload) {
        try {
            const cart = await Cart.findOne({
                _id: cartId,
                userId,
                status: "ACTIVE",
            });
            if (!cart) {
                throw new Error("Cart not found");
            }
            const entry = cart.entries.find((entry) => entry.entryId.toString() === entryId);
            if (!entry) {
                throw new Error("Entry not found");
            }
            if (entry.entryType !== "PACKAGE" || !entry.packageConfiguration) {
                throw new Error("Only package entries support included service updates");
            }
            const packageConfig = entry.packageConfiguration;
            const allServices = [
                ...packageConfig.services,
                ...packageConfig.addonServices,
            ];
            const targetService = allServices.find((service) => service.serviceId.toString() === serviceId);
            if (!targetService) {
                throw new Error("Service not found in package");
            }
            const tierId = payload.tierId || targetService.tier.tierId.toString();
            const locationId = payload.locationId || targetService.location.locationId.toString();
            const subServiceId = payload.subServiceId ||
                targetService.subService?.subServiceId?.toString();
            const rebuiltConfiguration = await this.buildServiceConfiguration({
                serviceId: targetService.serviceId.toString(),
                tierId,
                locationId,
                subServiceId,
                serviceRole: targetService.serviceRole,
            });
            const includedIndex = packageConfig.services.findIndex((service) => service.serviceId.toString() === serviceId);
            if (includedIndex !== -1) {
                packageConfig.services[includedIndex] = rebuiltConfiguration;
            }
            const addonIndex = packageConfig.addonServices.findIndex((service) => service.serviceId.toString() === serviceId);
            if (addonIndex !== -1) {
                packageConfig.addonServices[addonIndex] = rebuiltConfiguration;
            }
            await cart.save();
            await this.recalculateCart(cart._id.toString());
            return cart;
        }
        catch (error) {
            throw new Error(error.message || "Failed to update package service");
        }
    }
    async getUserCarts(userId, options) {
        try {
            const { status, cartType, searchTerm, limit = 20, page = 1, sortBy = "updatedAt", sortOrder = "desc", } = options || {};
            const skip = limit * (page - 1);
            const query = {
                userId,
            };
            if (status) {
                query.status = status;
            }
            if (cartType) {
                query.cartType = cartType;
            }
            if (searchTerm) {
                query.$or = [
                    {
                        "entries.serviceConfiguration.serviceSnapshot.name": {
                            $regex: searchTerm,
                            $options: "i",
                        },
                    },
                    {
                        "entries.packageConfiguration.packageSnapshot.name": {
                            $regex: searchTerm,
                            $options: "i",
                        },
                    },
                    {
                        "customerDetails.name": {
                            $regex: searchTerm,
                            $options: "i",
                        },
                    },
                    {
                        "customerDetails.phone": {
                            $regex: searchTerm,
                            $options: "i",
                        },
                    },
                ];
            }
            const sortCriteria = {};
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy === "createdAt") {
                sortCriteria.createdAt = -1;
            }
            const [data, total] = await Promise.all([
                Cart.find(query).sort(sortCriteria).skip(skip).limit(limit).lean(),
                Cart.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(error.message || "Failed to fetch carts");
        }
    }
}
//# sourceMappingURL=cart.service.js.map