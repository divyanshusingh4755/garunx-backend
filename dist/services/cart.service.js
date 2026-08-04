import mongoose, { Types } from "mongoose";
import { Cart, } from "../models/cart.model.js";
import { Service } from "../models/service.model.js";
import { Package } from "../models/package.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { CartPricingEngine } from "./cart-pricing.engine.js";
import { BookingBuilder } from "./booking.builder.js";
import { Booking } from "../models/booking.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { CashfreeService } from "./cashfree.service.js";
import { buildCartOwnerQuery } from "../utils/getCartOwner.js";
import { CouponService } from "./coupon.service.js";
import { Coupon } from "../models/coupon.model.js";
class CartService {
    static applyLineTax(target, tax) {
        if (tax) {
            target.tax = tax;
        }
        else {
            delete target.tax;
        }
    }
    static round(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
    static ensureUniqueIds(values, fieldName) {
        const normalized = values.map((value) => String(value?.itemId ?? value?.componentId ?? value?.serviceId ?? value));
        if (new Set(normalized).size !== normalized.length) {
            throw new Error(`Duplicate ${fieldName} are not allowed`);
        }
    }
    static clearLineDiscounts(cart) {
        for (const component of cart.selectedComponents ?? []) {
            component.discountAmount = 0;
        }
        for (const component of cart.addonComponents ?? []) {
            component.discountAmount = 0;
        }
        for (const service of cart.selectedServices ?? []) {
            service.discountAmount = 0;
        }
        for (const service of cart.addonServices ?? []) {
            service.discountAmount = 0;
        }
    }
    static calculateCouponDiscount(subtotal, coupon) {
        let discountAmount = 0;
        if (coupon.discountType === "PERCENTAGE") {
            discountAmount =
                (subtotal * coupon.discount) / 100;
            if (coupon.maxDiscountAmount &&
                discountAmount > coupon.maxDiscountAmount) {
                discountAmount =
                    coupon.maxDiscountAmount;
            }
        }
        else {
            discountAmount = coupon.discount;
        }
        return this.round(Math.min(Math.max(discountAmount, 0), subtotal));
    }
    static allocateDiscountToCartLines(cart, totals, totalDiscount) {
        this.clearLineDiscounts(cart);
        if (totalDiscount <= 0 || totals.subtotal <= 0) {
            return;
        }
        const lines = [];
        for (const component of cart.selectedComponents ?? []) {
            const componentId = component.componentId.toString();
            const pricingLine = totals.componentLines.get(componentId);
            if (!pricingLine) {
                continue;
            }
            lines.push({
                amount: pricingLine.amount,
                applyDiscount: (discount) => {
                    component.discountAmount = discount;
                },
            });
        }
        for (const component of cart.addonComponents ?? []) {
            const componentId = component.componentId.toString();
            const pricingLine = totals.componentLines.get(componentId);
            if (!pricingLine) {
                continue;
            }
            lines.push({
                amount: pricingLine.amount,
                applyDiscount: (discount) => {
                    component.discountAmount = discount;
                },
            });
        }
        for (const service of cart.selectedServices ?? []) {
            const serviceId = service.serviceId.toString();
            const pricingLine = totals.serviceLines.get(serviceId);
            if (!pricingLine) {
                continue;
            }
            lines.push({
                amount: pricingLine.amount,
                applyDiscount: (discount) => {
                    service.discountAmount = discount;
                },
            });
        }
        for (const service of cart.addonServices ?? []) {
            const serviceId = service.serviceId.toString();
            const pricingLine = totals.serviceLines.get(serviceId);
            if (!pricingLine) {
                continue;
            }
            lines.push({
                amount: pricingLine.amount,
                applyDiscount: (discount) => {
                    service.discountAmount = discount;
                },
            });
        }
        if (lines.length === 0) {
            return;
        }
        let allocatedDiscount = 0;
        lines.forEach((line, index) => {
            let lineDiscount;
            /*
             * Give the final line the remaining amount.
             * This avoids rounding differences.
             */
            if (index === lines.length - 1) {
                lineDiscount = this.round(totalDiscount - allocatedDiscount);
            }
            else {
                lineDiscount = this.round((line.amount / totals.subtotal) *
                    totalDiscount);
                lineDiscount = Math.min(lineDiscount, line.amount);
            }
            allocatedDiscount = this.round(allocatedDiscount + lineDiscount);
            line.applyDiscount(lineDiscount);
        });
    }
    static applyPricingResults(cart, totals) {
        cart.basePrice = totals.basePrice;
        cart.addonPrice = totals.addonPrice;
        cart.subtotal = totals.subtotal;
        cart.discountAmount = totals.discountAmount;
        cart.totalAmount = totals.totalAmount;
        cart.taxSummary = {
            taxableAmount: totals.taxSummary.taxableAmount,
            cgstAmount: totals.taxSummary.cgstAmount,
            sgstAmount: totals.taxSummary.sgstAmount,
            igstAmount: totals.taxSummary.igstAmount,
            totalTax: totals.taxSummary.totalTax,
            ...(totals.taxSummary.supplierStateCode
                ? {
                    supplierStateCode: totals.taxSummary.supplierStateCode,
                }
                : {}),
            ...(totals.taxSummary.placeOfSupplyStateCode
                ? {
                    placeOfSupplyStateCode: totals.taxSummary.placeOfSupplyStateCode,
                }
                : {}),
        };
        for (const component of cart.selectedComponents ?? []) {
            const line = totals.componentLines.get(component.componentId.toString());
            if (!line) {
                continue;
            }
            component.priceBeforeDiscount = line.amount;
            component.discountAmount = line.discountAmount;
            component.totalPrice = line.finalAmount;
            this.applyLineTax(component, line.tax);
        }
        for (const component of cart.addonComponents ?? []) {
            const line = totals.componentLines.get(component.componentId.toString());
            if (!line) {
                continue;
            }
            component.priceBeforeDiscount = line.amount;
            component.discountAmount = line.discountAmount;
            component.totalPrice = line.finalAmount;
            this.applyLineTax(component, line.tax);
        }
        for (const service of cart.selectedServices ?? []) {
            const line = totals.serviceLines.get(service.serviceId.toString());
            if (!line) {
                continue;
            }
            service.priceBeforeDiscount = line.amount;
            service.discountAmount = line.discountAmount;
            service.price = line.finalAmount;
            this.applyLineTax(service, line.tax);
        }
        for (const service of cart.addonServices ?? []) {
            const line = totals.serviceLines.get(service.serviceId.toString());
            if (!line) {
                continue;
            }
            service.priceBeforeDiscount = line.amount;
            service.discountAmount = line.discountAmount;
            service.price = line.finalAmount;
            this.applyLineTax(service, line.tax);
        }
        cart.markModified("selectedComponents");
        cart.markModified("addonComponents");
        cart.markModified("selectedServices");
        cart.markModified("addonServices");
        cart.markModified("taxSummary");
    }
    static ensureCartEditable(cart) {
        if (!["ACTIVE", "SCHEDULED"].includes(cart.status)) {
            throw new Error(`Cart cannot be modified in ${cart.status} state`);
        }
    }
    static formatCartResponse(cart, totals) {
        const cartType = cart.packageId
            ? "PACKAGE"
            : "SERVICE";
        return {
            _id: cart._id,
            cartType,
            serviceId: cart.serviceId ?? null,
            packageId: cart.packageId ?? null,
            name: cart.name,
            thumbnailImage: cart.thumbnailImage,
            categoryId: cart.categoryId,
            tierId: cart.tierId,
            tierName: cart.tierName,
            locationId: cart.locationId,
            locationName: cart.locationName,
            /*
             * Common field for frontend.
             *
             * SERVICE → selectedComponents
             * PACKAGE → selectedServices
             */
            items: cartType === "SERVICE"
                ? totals.componentItems
                : totals.serviceItems,
            addonComponents: cart.addonComponents ?? [],
            addonServices: cart.addonServices ?? [],
            basePrice: cart.basePrice,
            addonPrice: cart.addonPrice,
            subtotal: cart.subtotal,
            discountAmount: cart.discountAmount,
            totalAmount: cart.totalAmount,
            taxSummary: cart.taxSummary,
            coupon: cart.coupon ?? null,
            status: cart.status,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        };
    }
    static async createServiceCart(owner, payload) {
        const { serviceId, tierId, locationId } = payload;
        if (!Types.ObjectId.isValid(serviceId) ||
            !Types.ObjectId.isValid(tierId) ||
            !Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid serviceId, tierId, or locationId");
        }
        const service = await Service.findById(serviceId);
        if (!service || !service.isActive) {
            throw new Error("Service not found or inactive");
        }
        const isValidTier = service.tiers.some((t) => t.tierId.toString() === tierId);
        const isValidLocation = service.locations.some((l) => l.locationId.toString() === locationId);
        if (!isValidTier)
            throw new Error("Invalid tier");
        if (!isValidLocation)
            throw new Error("Invalid location");
        const ownerQuery = buildCartOwnerQuery(owner);
        const existingCart = await Cart.findOne({
            ...ownerQuery,
            serviceId,
            tierId,
            locationId,
            status: "ACTIVE",
        });
        if (existingCart) {
            throw new Error("Same service already exists in cart");
        }
        const cart = await Cart.create({
            ...ownerQuery,
            serviceId: service._id,
            name: service.name,
            thumbnailImage: service.thumbnailImage ?? "",
            categoryId: service.categoryId,
            tierId,
            tierName: service.tiers.find((t) => t.tierId.toString() === tierId)?.name || "",
            locationId,
            locationName: service.locations.find((l) => l.locationId.toString() === locationId)
                ?.name || "",
            selectedComponents: [],
            addonComponents: [],
            addonServices: [],
            basePrice: 0,
            addonPrice: 0,
            subtotal: 0,
            discountAmount: 0,
            totalAmount: 0,
            taxSummary: {
                taxableAmount: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                totalTax: 0,
            },
            status: "ACTIVE",
        });
        const totals = await CartPricingEngine.calculateCartTotals(cart);
        this.applyPricingResults(cart, totals);
        await cart.save();
        return this.formatCartResponse(cart, totals);
    }
    static async createPackageCart(owner, payload) {
        const { packageId, tierId, locationId, } = payload;
        if (!Types.ObjectId.isValid(packageId) ||
            !Types.ObjectId.isValid(tierId) ||
            !Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid packageId, tierId, or locationId");
        }
        const pkg = await Package.findById(packageId);
        if (!pkg?.isActive) {
            throw new Error("Package not found or inactive");
        }
        const tier = pkg.tiers.find((item) => item.tierId.toString() === tierId);
        const location = pkg.locations.find((item) => item.locationId.toString() ===
            locationId);
        if (!tier) {
            throw new Error("Invalid tier");
        }
        if (!location) {
            throw new Error("Invalid location");
        }
        if (!location.isActive) {
            throw new Error("Location is inactive for this package");
        }
        const packageTierMap = await PackageTierMap.findOne({
            packageId,
            tierId,
        }).lean();
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        /*
         * Include required services automatically.
         * Related services remain addons.
         */
        const requiredServices = (packageTierMap.services ?? []).filter((service) => service.isRequired &&
            !service.isRelated);
        if (requiredServices.length === 0) {
            throw new Error("Package has no required services configured");
        }
        const requiredServiceIds = requiredServices.map((service) => service.serviceId);
        const pricingRows = await PackageTierPricing.find({
            packageId,
            tierId,
            locationId,
            serviceId: {
                $in: requiredServiceIds,
            },
        }).lean();
        const pricingMap = new Map(pricingRows.map((pricing) => [
            pricing.serviceId.toString(),
            pricing,
        ]));
        /*
         * Every required service must have pricing.
         */
        for (const service of requiredServices) {
            const serviceId = service.serviceId.toString();
            if (!pricingMap.has(serviceId)) {
                throw new Error(`Pricing not found for required service: ${service.name}`);
            }
        }
        const selectedServices = requiredServices.map((service) => {
            const pricing = pricingMap.get(service.serviceId.toString());
            return {
                serviceId: service.serviceId,
                name: service.name,
                priceBeforeDiscount: pricing.finalPrice,
                discountAmount: 0,
                price: pricing.finalPrice,
            };
        });
        const ownerQuery = buildCartOwnerQuery(owner);
        const existingCart = await Cart.findOne({
            ...ownerQuery,
            packageId,
            tierId,
            locationId,
            status: "ACTIVE",
        });
        if (existingCart) {
            throw new Error("Same package already exists in cart");
        }
        const cart = await Cart.create({
            ...ownerQuery,
            packageId: pkg._id,
            name: pkg.name,
            thumbnailImage: pkg.thumbnailImage ?? "",
            categoryId: pkg.categoryId,
            tierId: tier.tierId,
            tierName: tier.name,
            locationId: location.locationId,
            locationName: location.name,
            /*
             * Required package services must be present
             * before calculating package-cart totals.
             */
            selectedServices,
            addonServices: [],
            basePrice: 0,
            addonPrice: 0,
            subtotal: 0,
            discountAmount: 0,
            totalAmount: 0,
            taxSummary: {
                taxableAmount: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                totalTax: 0,
            },
            status: "ACTIVE",
        });
        const totals = await CartPricingEngine
            .calculateCartTotals(cart);
        this.applyPricingResults(cart, totals);
        await cart.save();
        return this.formatCartResponse(cart, totals);
    }
    static async getUserCarts(owner, filters = {}) {
        const ownerQuery = buildCartOwnerQuery(owner);
        const query = {
            ...ownerQuery,
        };
        if (filters.status) {
            const statuses = filters.status
                .split(",")
                .map((s) => s.trim());
            query.status = { $in: statuses };
        }
        else {
            query.status = {
                $nin: ["EXPIRED", "DELETED"],
            };
        }
        const parsedPage = Number(filters.page);
        const parsedLimit = Number(filters.limit);
        const page = Number.isInteger(parsedPage) && parsedPage > 0
            ? parsedPage
            : 1;
        const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 10;
        const skip = (page - 1) * limit;
        const [carts, total] = await Promise.all([
            Cart.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("serviceId packageId name thumbnailImage tierName locationName status totalAmount updatedAt scheduledDate scheduledTime activeBookingId"),
            Cart.countDocuments(query),
        ]);
        return {
            carts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPreviousPage: page > 1,
            },
        };
    }
    static async getCartById(owner, cartId) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
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
            const componentsMap = new Map((await Component.find({ _id: { $in: componentIds } }).lean()).map((c) => [c._id.toString(), c]));
            const itemIds = serviceComponents.flatMap((c) => c.items?.map((i) => i.itemId) || []);
            const itemsMap = new Map((await ComponentItem.find({ _id: { $in: itemIds } }).lean()).map((i) => [i._id.toString(), i]));
            // Hydrate selected components
            const hydratedSelectedComponents = (cart.selectedComponents || []).map((comp) => ({
                ...comp,
                component: componentsMap.get(comp.componentId.toString()),
                items: (comp.items || []).map((item) => ({
                    ...item,
                    itemDetails: itemsMap.get(item.itemId.toString()),
                })),
            }));
            const hydratedAddonComponents = (cart.addonComponents || []).map((comp) => ({
                ...comp,
                component: componentsMap.get(comp.componentId?.toString()),
                items: (comp.items || []).map((item) => ({
                    ...item,
                    itemDetails: itemsMap.get(item.itemId.toString()),
                })),
            }));
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
                .lean({ virtuals: true }));
            if (!pkg) {
                throw new Error("Package not found");
            }
            // Get services for this cart's tier
            const packageTierMap = pkg.tierMappings?.find((m) => m.tierId.toString() === cart.tierId.toString());
            const serviceIds = packageTierMap?.services?.map((s) => s.serviceId) || [];
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
            const componentsMap = new Map((await Component.find({
                _id: { $in: componentIds },
            }).lean()).map((c) => [c._id.toString(), c]));
            const itemIds = serviceComponents.flatMap((c) => c.items?.map((i) => i.itemId) || []);
            const itemsMap = new Map((await ComponentItem.find({
                _id: { $in: itemIds },
            }).lean()).map((i) => [i._id.toString(), i]));
            // Group service components by serviceId
            const serviceComponentMap = new Map();
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
            const addonServiceIds = cart.addonServices?.map((s) => s.serviceId) || [];
            const addonServicesFromDB = await Service.find({
                _id: { $in: addonServiceIds },
            }).lean();
            const addonServicesMap = new Map(addonServicesFromDB.map((service) => [service._id.toString(), service]));
            const hydratedAddonServices = (cart.addonServices || []).map((addon) => ({
                ...addon,
                service: addonServicesMap.get(addon.serviceId.toString()),
            }));
            const selectedServiceIds = cart.selectedServices?.map((s) => s.serviceId) || [];
            const selectedServicesFromDB = await Service.find({
                _id: { $in: selectedServiceIds },
            }).lean();
            const selectedServicesMap = new Map(selectedServicesFromDB.map((s) => [s._id.toString(), s]));
            const hydratedSelectedServices = (cart.selectedServices || []).map((s) => ({
                ...s,
                service: selectedServicesMap.get(String(s.serviceId)),
            }));
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
    static async updateSelectedComponents(owner, cartId, payload) {
        const { selectedComponents } = payload;
        if (!Array.isArray(selectedComponents)) {
            throw new Error("selectedComponents must be an array");
        }
        this.ensureUniqueIds(selectedComponents.map((item) => item?.componentId), "componentIds");
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (!cart.serviceId) {
            throw new Error("This operation is only allowed for service carts");
        }
        const serviceComponents = await ServiceComponent.find({
            serviceId: cart.serviceId,
            tierId: cart.tierId,
        }).lean();
        const componentMap = new Map(serviceComponents.map((c) => [c.componentId.toString(), c]));
        const missingRequired = serviceComponents
            .filter((c) => c.isRequired)
            .filter((c) => {
            return !selectedComponents?.some((sc) => sc.componentId.toString() === c.componentId.toString());
        });
        if (missingRequired.length > 0) {
            throw new Error(`Missing required components: ${missingRequired
                .map((c) => c.name)
                .join(", ")}`);
        }
        const formattedComponents = [];
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
            const formattedItems = [];
            for (const selectedItem of sc.items || []) {
                const selectedItemId = typeof selectedItem === "string"
                    ? selectedItem
                    : selectedItem?.itemId;
                if (!selectedItemId) {
                    throw new Error(`Invalid item format in ${componentConfig.name}`);
                }
                const matchedItem = allowedItems.find((item) => item.itemId.toString() === selectedItemId.toString());
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
                priceBeforeDiscount: pricing.price,
                discountAmount: 0,
                totalPrice: pricing.price,
            });
        }
        cart.selectedComponents = formattedComponents;
        await Cart.updateOne({ _id: cart._id }, {
            $set: {
                selectedComponents: formattedComponents,
            },
        });
        const result = await this.recalculateCart(owner, cart._id.toString(), {
            persist: true,
        });
        return result.cart;
    }
    static async updateAddonComponents(owner, cartId, payload) {
        const { addonComponents } = payload;
        if (!Array.isArray(addonComponents)) {
            throw new Error("addonComponents must be an array");
        }
        this.ensureUniqueIds(addonComponents.map((item) => item?.componentId), "componentIds");
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (!cart.serviceId) {
            throw new Error("This operation is only allowed for service carts");
        }
        const serviceComponents = await ServiceComponent.find({
            serviceId: cart.serviceId,
            tierId: cart.tierId,
        }).lean();
        const componentMap = new Map(serviceComponents.map((c) => [c.componentId.toString(), c]));
        const updatedAddonComponents = [];
        for (const ac of addonComponents || []) {
            const component = componentMap.get(ac.componentId?.toString());
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
            const formattedItems = [];
            const requestedItems = ac.items || [];
            this.ensureUniqueIds(requestedItems, "itemIds");
            for (const selectedItem of requestedItems) {
                const selectedItemId = typeof selectedItem === "string"
                    ? selectedItem
                    : selectedItem?.itemId;
                if (!selectedItemId) {
                    throw new Error(`Invalid item format in ${component.name}`);
                }
                const matchedItem = allowedItems.find((item) => item.itemId.toString() ===
                    selectedItemId.toString());
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
                priceBeforeDiscount: pricing.price,
                discountAmount: 0,
                totalPrice: pricing.price,
            });
        }
        cart.addonComponents = updatedAddonComponents;
        await Cart.updateOne({ _id: cart._id }, {
            $set: {
                addonComponents: updatedAddonComponents,
            },
        });
        const result = await this.recalculateCart(owner, cart._id.toString(), {
            persist: true,
        });
        return result.cart;
    }
    static async updateSelectedServices(owner, cartId, payload) {
        const { serviceIds } = payload;
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (!cart.packageId) {
            throw new Error("This operation is only allowed for package carts");
        }
        if (!Array.isArray(serviceIds)) {
            throw new Error("serviceIds must be an array");
        }
        this.ensureUniqueIds(serviceIds, "serviceIds");
        const packageTierMap = await PackageTierMap.findOne({
            packageId: cart.packageId,
            tierId: cart.tierId,
        }).lean();
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        const allowedServices = packageTierMap.services || [];
        const requiredServiceIds = allowedServices
            .filter((service) => service.isRequired && !service.isRelated)
            .map((service) => service.serviceId.toString());
        const selectedServiceIdSet = new Set(serviceIds.map((serviceId) => serviceId.toString()));
        const missingRequiredServices = requiredServiceIds.filter((serviceId) => !selectedServiceIdSet.has(serviceId));
        if (missingRequiredServices.length > 0) {
            throw new Error("All required package services must be selected");
        }
        const selectedServices = [];
        const pricingList = await PackageTierPricing.find({
            packageId: cart.packageId,
            tierId: cart.tierId,
            locationId: cart.locationId,
            serviceId: { $in: serviceIds },
        }).lean();
        const pricingMap = new Map(pricingList.map((p) => [p.serviceId.toString(), p.finalPrice]));
        for (const serviceId of serviceIds) {
            const matchedService = allowedServices.find((s) => s.serviceId.toString() === serviceId.toString());
            if (!matchedService) {
                throw new Error(`Invalid addon service selected`);
            }
            if (matchedService.isRelated) {
                throw new Error(`${matchedService.name} is an addon service. Use updateAddonServices instead.`);
            }
            const price = pricingMap.get(serviceId.toString());
            if (price === undefined) {
                throw new Error(`Pricing not found for service ${matchedService.name}`);
            }
            selectedServices.push({
                serviceId: matchedService.serviceId,
                name: matchedService.name,
                priceBeforeDiscount: price,
                discountAmount: 0,
                price,
            });
        }
        cart.selectedServices = selectedServices;
        await Cart.updateOne({ _id: cart._id }, {
            $set: {
                selectedServices,
            },
        });
        const result = await this.recalculateCart(owner, cart._id.toString(), {
            persist: true,
        });
        return result.cart;
    }
    static async updateAddonServices(owner, cartId, payload) {
        const { serviceIds } = payload;
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (!cart.packageId) {
            throw new Error("This operation is only allowed for package carts");
        }
        if (!Array.isArray(serviceIds)) {
            throw new Error("serviceIds must be an array");
        }
        this.ensureUniqueIds(serviceIds, "serviceIds");
        const packageTierMap = await PackageTierMap.findOne({
            packageId: cart.packageId,
            tierId: cart.tierId,
        }).lean();
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        const allowedServices = packageTierMap.services || [];
        const addonServices = [];
        const pricingList = await PackageTierPricing.find({
            packageId: cart.packageId,
            tierId: cart.tierId,
            locationId: cart.locationId,
            serviceId: { $in: serviceIds },
        }).lean();
        const pricingMap = new Map(pricingList.map((p) => [p.serviceId.toString(), p.finalPrice]));
        for (const serviceId of serviceIds) {
            const matchedService = allowedServices.find((s) => s.serviceId.toString() === serviceId.toString());
            if (!matchedService) {
                throw new Error(`Invalid addon service selected`);
            }
            if (matchedService.isRequired || !matchedService.isRelated) {
                throw new Error(`${matchedService.name} is not an addon service.`);
            }
            const price = pricingMap.get(serviceId.toString());
            if (price === undefined) {
                throw new Error(`Pricing not found for service ${matchedService.name}`);
            }
            addonServices.push({
                serviceId: matchedService.serviceId,
                name: matchedService.name,
                priceBeforeDiscount: price,
                discountAmount: 0,
                price,
            });
        }
        cart.addonServices = addonServices;
        await Cart.updateOne({ _id: cart._id }, {
            $set: {
                addonServices,
            },
        });
        const result = await this.recalculateCart(owner, cart._id.toString(), {
            persist: true,
        });
        return result.cart;
    }
    static async updateSchedule(owner, cartId, payload) {
        const { scheduledDate, scheduledTime, } = payload;
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        if (typeof scheduledDate !== "string" ||
            !scheduledDate.trim()) {
            throw new Error("scheduledDate is required");
        }
        if (typeof scheduledTime !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) {
            throw new Error("scheduledTime is required in HH:mm format");
        }
        /*
         * Supports:
         * 2026-08-03
         * 2026-08-03T00:00:00.000Z
         */
        const datePart = scheduledDate.split("T")[0];
        if (!datePart ||
            !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            throw new Error("scheduledDate must be in YYYY-MM-DD format");
        }
        /*
         * Interpret the selected date and time as India time.
         * Example:
         * 2026-08-03 + 10:30
         * becomes 2026-08-03T05:00:00.000Z
         */
        const scheduledAt = new Date(`${datePart}T${scheduledTime}:00+05:30`);
        if (Number.isNaN(scheduledAt.getTime())) {
            throw new Error("Invalid scheduled date or time");
        }
        if (scheduledAt <= new Date()) {
            throw new Error("Scheduled date and time cannot be in the past");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        cart.scheduledAt = scheduledAt;
        cart.schedulingTimezone =
            "Asia/Kolkata";
        cart.status = "SCHEDULED";
        await cart.save();
        return cart;
    }
    static async updateCustomerDetails(owner, cartId, payload) {
        const { bookingFor, name, email, phone, address, caste, gotra } = payload;
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (bookingFor &&
            !["MYSELF", "OTHER"].includes(bookingFor)) {
            throw new Error("Invalid bookingFor value");
        }
        if (email && !email.includes("@")) {
            throw new Error("Invalid email format");
        }
        if (phone && phone.length < 10) {
            throw new Error("Invalid phone number");
        }
        if (bookingFor) {
            cart.bookingFor = bookingFor;
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
    static async updateCartNotes(owner, cartId, payload) {
        const { notes } = payload;
        if (notes !== undefined &&
            typeof notes !== "string") {
            throw new Error("notes must be a string");
        }
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        cart.notes = notes;
        await cart.save();
        return cart;
    }
    static async recalculateCart(owner, cartId, options) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const session = options?.session;
        const cartQuery = Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (session) {
            cartQuery.session(session);
        }
        const cart = await cartQuery;
        if (!cart) {
            throw new Error("Cart not found");
        }
        if (cart.status === "CHECKOUT_PENDING" &&
            options?.persist) {
            throw new Error("Cannot recalculate a cart during checkout");
        }
        const oldValues = {
            basePrice: cart.basePrice,
            addonPrice: cart.addonPrice,
            subtotal: cart.subtotal,
            discountAmount: cart.discountAmount,
            totalAmount: cart.totalAmount,
            totalTax: cart.taxSummary?.totalTax ?? 0,
        };
        const changes = [];
        /*
         * First pass:
         * calculate original prices without any old coupon allocation.
         */
        this.clearLineDiscounts(cart);
        const grossTotals = await CartPricingEngine.calculateCartTotals(cart);
        let couponDiscountAmount = 0;
        if (cart.couponId) {
            const couponQuery = Coupon.findById(cart.couponId);
            if (session) {
                couponQuery.session(session);
            }
            const coupon = await couponQuery.lean();
            if (!coupon) {
                changes.push("Applied coupon was removed because it no longer exists");
                delete cart.couponId;
                delete cart.couponCode;
            }
            else {
                const now = new Date();
                const expired = (coupon.validFrom &&
                    coupon.validFrom > now) ||
                    (coupon.validTill &&
                        coupon.validTill < now);
                if (grossTotals.subtotal <
                    coupon.minOrderAmount) {
                    changes.push(`Coupon ${coupon.couponCode} was removed because minimum order amount of ₹${coupon.minOrderAmount} is not met`);
                    delete cart.couponId;
                    delete cart.couponCode;
                }
                else if (!coupon.isActive ||
                    expired ||
                    (coupon.usageLimit > 0 &&
                        coupon.usedCount >= coupon.usageLimit)) {
                    changes.push(`Coupon ${coupon.couponCode} was removed because it is no longer valid`);
                    delete cart.couponId;
                    delete cart.couponCode;
                }
                else {
                    couponDiscountAmount =
                        this.calculateCouponDiscount(grossTotals.subtotal, coupon);
                }
            }
        }
        /*
         * Allocate coupon discount to individual lines.
         */
        this.allocateDiscountToCartLines(cart, grossTotals, couponDiscountAmount);
        /*
         * Second pass:
         * calculate GST using allocated line discounts.
         */
        const finalTotals = await CartPricingEngine.calculateCartTotals(cart);
        this.applyPricingResults(cart, finalTotals);
        if (oldValues.basePrice !== cart.basePrice) {
            changes.push(`Base price changed from ${oldValues.basePrice} to ${cart.basePrice}`);
        }
        if (oldValues.addonPrice !== cart.addonPrice) {
            changes.push(`Addon price changed from ${oldValues.addonPrice} to ${cart.addonPrice}`);
        }
        if (oldValues.subtotal !== cart.subtotal) {
            changes.push(`Subtotal changed from ${oldValues.subtotal} to ${cart.subtotal}`);
        }
        if (oldValues.discountAmount !==
            cart.discountAmount) {
            changes.push(`Discount changed from ${oldValues.discountAmount} to ${cart.discountAmount}`);
        }
        if (oldValues.totalTax !==
            cart.taxSummary.totalTax) {
            changes.push(`Tax changed from ${oldValues.totalTax} to ${cart.taxSummary.totalTax}`);
        }
        if (oldValues.totalAmount !==
            cart.totalAmount) {
            changes.push(`Total amount changed from ${oldValues.totalAmount} to ${cart.totalAmount}`);
        }
        if (options?.persist) {
            await cart.save(session
                ? { session }
                : undefined);
        }
        return {
            cart,
            changes,
        };
    }
    static async validateCart(owner, cartId, persist, session) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const recalculated = await this.recalculateCart(owner, cartId, {
            persist: persist,
            ...(session ? { session } : {}),
        });
        const cart = recalculated.cart;
        const changes = recalculated.changes;
        if (["EXPIRED", "CANCELLED"].includes(cart.status)) {
            throw new Error("Cart is not in a valid state");
        }
        const errors = [];
        if (cart.serviceId) {
            const service = await Service.findById(cart.serviceId)
                .session(session || null)
                .lean();
            if (!service) {
                errors.push("Service no longer exists");
            }
            else if (!service.isActive) {
                errors.push("Service is no longer active");
            }
            else {
                const tierExists = service.tiers.some((tier) => tier.tierId.toString() ===
                    cart.tierId.toString());
                const locationExists = service.locations.some((location) => location.locationId.toString() ===
                    cart.locationId.toString());
                if (!tierExists) {
                    errors.push("Selected service tier is no longer available");
                }
                if (!locationExists) {
                    errors.push("Selected service location is no longer available");
                }
            }
            const serviceComponents = await ServiceComponent.find({
                serviceId: cart.serviceId,
                tierId: cart.tierId,
            })
                .session(session || null)
                .lean();
            const requiredComponents = serviceComponents.filter((c) => c.isRequired);
            const selectedMap = new Set((cart.selectedComponents || []).map((c) => c.componentId.toString()));
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
            const pkg = await Package.findById(cart.packageId)
                .session(session || null)
                .lean();
            if (!pkg) {
                errors.push("Package no longer exists");
            }
            else if (!pkg.isActive) {
                errors.push("Package is no longer active");
            }
            else {
                const tierExists = pkg.tiers.some((t) => t.tierId.toString() === cart.tierId.toString());
                const locationExists = pkg.locations.some((l) => l.locationId.toString() === cart.locationId.toString());
                if (!tierExists) {
                    errors.push("Selected package tier is no longer available");
                }
                if (!locationExists) {
                    errors.push("Selected package location is no longer available");
                }
                const packageTierMap = await PackageTierMap.findOne({
                    packageId: cart.packageId,
                    tierId: cart.tierId,
                })
                    .session(session || null)
                    .lean();
                if (!packageTierMap) {
                    errors.push("Package tier mapping no longer exists");
                }
                else {
                    const selectedServiceIds = new Set((cart.selectedServices || []).map((service) => service.serviceId.toString()));
                    for (const mappedService of packageTierMap.services || []) {
                        if (mappedService.isRequired &&
                            !mappedService.isRelated &&
                            !selectedServiceIds.has(mappedService.serviceId.toString())) {
                            errors.push(`Missing required service: ${mappedService.name}`);
                        }
                    }
                }
                const pricingExists = await PackageTierPricing.exists({
                    packageId: cart.packageId,
                    tierId: cart.tierId,
                    locationId: cart.locationId,
                }).session(session || null);
                if (!pricingExists) {
                    errors.push("Package pricing is no longer available");
                }
            }
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
    static async checkoutCart(userId, cartId) {
        const session = await mongoose.startSession();
        try {
            const result = await session.withTransaction(async () => {
                if (!userId) {
                    throw new Error("Token missing");
                }
                if (!mongoose.Types.ObjectId.isValid(cartId)) {
                    throw new Error("Invalid cartId");
                }
                const cart = await Cart.findOne({
                    _id: cartId,
                    userId,
                    status: {
                        $in: [
                            "ACTIVE",
                            "SCHEDULED",
                            "CHECKOUT_PENDING",
                        ],
                    },
                }, null, { session });
                if (!cart) {
                    throw new Error("Cart not found");
                }
                /**
                 * Reuse checkout booking.
                 */
                if (cart.activeBookingId) {
                    const existingBooking = await Booking.findOne({
                        _id: cart.activeBookingId,
                        userId,
                        cartId: cart._id,
                        isDeleted: false,
                    }).session(session);
                    if (existingBooking &&
                        existingBooking.payment
                            .status !== "PAID") {
                        return existingBooking;
                    }
                }
                if (!cart.scheduledAt) {
                    throw new Error("Scheduled date not set");
                }
                const validation = await this.validateCart({ userId }, cartId, true, session);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(", "));
                }
                const expiry = new Date(Date.now() +
                    30 * 60 * 1000);
                const lockedCart = await Cart.findOneAndUpdate({
                    _id: cartId,
                    userId,
                    status: {
                        $in: [
                            "ACTIVE",
                            "SCHEDULED",
                        ],
                    },
                }, {
                    $set: {
                        status: "CHECKOUT_PENDING",
                        checkoutExpiresAt: expiry,
                    },
                }, {
                    new: true,
                    session,
                });
                if (!lockedCart) {
                    throw new Error("Checkout already initiated");
                }
                const bookingData = await BookingBuilder
                    .buildFromCart(lockedCart);
                const bookingPayload = {
                    userId: new mongoose.Types.ObjectId(userId),
                    cartId: lockedCart._id,
                    bookingFor: lockedCart.bookingFor,
                    bookedBy: "USER",
                    entries: bookingData.entries,
                    customerDetails: lockedCart.customerDetails,
                    pricing: bookingData.pricing,
                    payment: {
                        status: "PENDING",
                    },
                    paymentExpiresAt: expiry,
                    status: "PENDING_PAYMENT",
                    scheduledAt: lockedCart.scheduledAt,
                    ...(lockedCart.notes
                        ? {
                            notes: lockedCart.notes,
                        }
                        : {}),
                    cartSnapshot: lockedCart.toObject(),
                };
                const [createdBooking] = await Booking.create([bookingPayload], { session });
                if (!createdBooking) {
                    throw new Error("Failed to create booking");
                }
                await Cart.updateOne({
                    _id: lockedCart._id,
                }, {
                    $set: {
                        activeBookingId: createdBooking._id,
                    },
                }, { session });
                return createdBooking;
            });
            const finalBooking = result;
            if (finalBooking.payment.status ===
                "PAID") {
                return {
                    bookingId: finalBooking._id,
                    bookingReference: finalBooking.bookingReference,
                    totalAmount: finalBooking.pricing
                        .grandTotal,
                    paymentCompleted: true,
                };
            }
            /**
             * Existing Cashfree order can be reused.
             */
            if (finalBooking.payment
                .providerOrderId &&
                finalBooking.payment
                    .paymentSessionId) {
                return {
                    bookingId: finalBooking._id,
                    bookingReference: finalBooking.bookingReference,
                    totalAmount: finalBooking.pricing
                        .grandTotal,
                    providerOrderId: finalBooking.payment
                        .providerOrderId,
                    paymentSessionId: finalBooking.payment
                        .paymentSessionId,
                    reusedPaymentSession: true,
                };
            }
            /**
             * Use a separate provider order ID.
             *
             * Do not rely only on bookingReference
             * when retries are possible.
             */
            const providerOrderId = `${finalBooking.bookingReference}-${Date.now()}`;
            const cashfreeOrder = await CashfreeService.createOrder({
                orderId: providerOrderId,
                amount: finalBooking.pricing
                    .grandTotal,
                customerName: finalBooking.customerDetails
                    ?.name || "Customer",
                customerEmail: finalBooking.customerDetails
                    ?.email || "",
                customerPhone: finalBooking.customerDetails
                    ?.phone || "",
                userId,
            });
            await Booking.updateOne({
                _id: finalBooking._id,
                "payment.status": {
                    $ne: "PAID",
                },
            }, {
                $set: {
                    "payment.providerOrderId": cashfreeOrder.order_id,
                    "payment.paymentSessionId": cashfreeOrder
                        .payment_session_id,
                    "payment.lastAttemptAt": new Date(),
                    "payment.status": "PENDING",
                },
                $inc: {
                    "payment.attempts": 1,
                },
            });
            return {
                bookingId: finalBooking._id,
                bookingReference: finalBooking.bookingReference,
                totalAmount: finalBooking.pricing
                    .grandTotal,
                providerOrderId: cashfreeOrder.order_id,
                paymentSessionId: cashfreeOrder
                    .payment_session_id,
                reusedPaymentSession: false,
            };
        }
        finally {
            await session.endSession();
        }
    }
    static async deleteCart(owner, cartId) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        cart.status = "DELETED";
        await cart.save();
        return true;
    }
    static async expireCheckoutPendingCarts() {
        const now = new Date();
        await Cart.updateMany({
            status: "CHECKOUT_PENDING",
            checkoutExpiresAt: {
                $lte: now,
            },
        }, {
            $set: {
                status: "ACTIVE",
            },
            $unset: {
                checkoutExpiresAt: 1,
                activeBookingId: 1,
            },
        });
    }
    static async mergeGuestCartToUser(guestId, userId) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const guestCarts = await Cart.find({
                    guestId,
                    status: "ACTIVE",
                })
                    .select("_id serviceId packageId tierId locationId")
                    .session(session);
                const duplicateGuestCartIds = [];
                for (const cart of guestCarts) {
                    const duplicateQuery = {
                        userId,
                        tierId: cart.tierId,
                        locationId: cart.locationId,
                        status: "ACTIVE",
                    };
                    if (cart.serviceId) {
                        duplicateQuery.serviceId = cart.serviceId;
                    }
                    else if (cart.packageId) {
                        duplicateQuery.packageId = cart.packageId;
                    }
                    const duplicateExists = await Cart.exists(duplicateQuery).session(session);
                    if (duplicateExists) {
                        duplicateGuestCartIds.push(cart._id);
                    }
                }
                if (duplicateGuestCartIds.length > 0) {
                    await Cart.deleteMany({
                        _id: { $in: duplicateGuestCartIds },
                    }).session(session);
                }
                await Cart.updateMany({
                    guestId,
                    status: "ACTIVE",
                    _id: { $nin: duplicateGuestCartIds },
                }, {
                    $set: {
                        userId,
                    },
                    $unset: {
                        guestId: 1,
                    },
                }).session(session);
            });
        }
        finally {
            await session.endSession();
        }
    }
    static async applyCoupon(owner, cartId, couponCode) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        if (cart.couponId) {
            throw new Error("A coupon is already applied. Remove it first.");
        }
        if (typeof cart.subtotal !== "number" ||
            !Number.isFinite(cart.subtotal)) {
            throw new Error("Cart subtotal is not calculated");
        }
        const bookingCount = cart.userId
            ? await Booking.countDocuments({ userId: cart.userId })
            : 0;
        const validation = await CouponService.validateCoupon({
            couponCode,
            ...(cart.serviceId && {
                serviceId: cart.serviceId.toString(),
            }),
            ...(cart.packageId && {
                packageId: cart.packageId.toString(),
            }),
            orderAmount: cart.subtotal,
            ...(owner.userId && {
                userId: owner.userId.toString(),
            }),
            isFirstOrder: bookingCount === 0,
        });
        cart.couponId = validation.couponId;
        cart.couponCode = validation.couponCode;
        await cart.save();
        const result = await this.recalculateCart(owner, cartId, {
            persist: true,
        });
        return result.cart;
    }
    static async removeCoupon(owner, cartId) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        this.ensureCartEditable(cart);
        delete cart.couponId;
        delete cart.couponCode;
        await cart.save();
        const result = await this.recalculateCart(owner, cartId, {
            persist: true,
        });
        return result.cart;
    }
    static async reopenCart(owner, cartId) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        const cart = await Cart.findOne({
            _id: cartId,
            ...buildCartOwnerQuery(owner),
        });
        if (!cart) {
            throw new Error("Cart not found");
        }
        if (cart.status !== "CHECKOUT_PENDING") {
            throw new Error("Only checkout pending carts can be reopened.");
        }
        if (cart.checkoutExpiresAt &&
            cart.checkoutExpiresAt > new Date()) {
            throw new Error("Checkout is still active and cannot be reopened yet");
        }
        cart.status = "ACTIVE";
        cart.set({
            checkedOutAt: undefined,
            checkoutExpiresAt: undefined,
            convertedToBookingAt: undefined,
            activeBookingId: undefined,
        });
        await cart.save();
        return cart;
    }
}
export default CartService;
//# sourceMappingURL=cart.service.js.map