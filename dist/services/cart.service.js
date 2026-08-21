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
import { SubServiceComponent } from "../models/subservices.model.js";
class CartService {
    static applyLineTax(target, tax) {
        if (tax) {
            target.tax = tax;
        }
        else {
            delete target.tax;
        }
    }
    static async getSubServiceSnapshotsByServiceIds(serviceIds) {
        if (serviceIds.length === 0) {
            return new Map();
        }
        /**
         * Remove duplicate service IDs before querying.
         */
        const uniqueServiceIds = [
            ...new Map(serviceIds.map((serviceId) => [
                serviceId.toString(),
                serviceId,
            ])).values(),
        ];
        /**
         * One query for ALL services.
         *
         * Avoids N+1 queries when a package
         * contains many services.
         */
        const subServices = await SubServiceComponent.find({
            serviceId: {
                $in: uniqueServiceIds,
            },
            isActive: true,
        })
            .sort({
            createdAt: 1,
        })
            .lean();
        const subServiceMap = new Map();
        /**
         * Always initialize every requested service
         * with an empty array.
         *
         * This guarantees:
         *
         * subServices: []
         *
         * instead of undefined.
         */
        for (const serviceId of uniqueServiceIds) {
            subServiceMap.set(serviceId.toString(), []);
        }
        for (const subService of subServices) {
            const key = subService.serviceId.toString();
            const list = subServiceMap.get(key) ?? [];
            const snapshot = {
                subServiceId: subService._id,
                name: subService.name,
                description: subService.description,
                ...(subService.image
                    ? {
                        image: subService.image,
                    }
                    : {}),
            };
            list.push(snapshot);
            subServiceMap.set(key, list);
        }
        return subServiceMap;
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
            discountAmount = (subtotal * coupon.discount) / 100;
            if (coupon.maxDiscountAmount &&
                discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
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
                lineDiscount = this.round((line.amount / totals.subtotal) * totalDiscount);
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
            /**
             * Keep your existing common pricing items.
             */
            items: cartType === "SERVICE"
                ? totals.componentItems
                : totals.serviceItems,
            /**
             * Now always return service structure too.
             *
             * SERVICE:
             * [
             *   {
             *     serviceId,
             *     name,
             *     subServices: [...]
             *   }
             * ]
             *
             * PACKAGE:
             * [
             *   service1,
             *   service2,
             *   ...
             * ]
             */
            selectedServices: cart.selectedServices ?? [],
            selectedComponents: cart.selectedComponents ?? [],
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
        const { serviceId, tierId, locationId, } = payload;
        if (!Types.ObjectId.isValid(serviceId) ||
            !Types.ObjectId.isValid(tierId) ||
            !Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid serviceId, tierId, or locationId");
        }
        const service = await Service.findById(serviceId);
        if (!service ||
            !service.isActive ||
            !service.isComplete) {
            throw new Error("Service is not available");
        }
        const tier = service.tiers.find((item) => item.tierId.toString() ===
            tierId);
        if (!tier) {
            throw new Error("Invalid tier");
        }
        const location = service.locations.find((item) => item.locationId.toString() ===
            locationId);
        if (!location) {
            throw new Error("Invalid location");
        }
        if (!location.isActive) {
            throw new Error("Location is inactive for this service");
        }
        const ownerQuery = buildCartOwnerQuery(owner);
        const existingCart = await Cart.findOne({
            ...ownerQuery,
            serviceId,
            tierId,
            locationId,
            status: {
                $in: [
                    "ACTIVE",
                    "SCHEDULED",
                ],
            },
        });
        if (existingCart) {
            throw new Error("Same service already exists in cart");
        }
        /**
         * Fetch all active sub-service steps
         * for the main service.
         */
        const subServiceMap = await this.getSubServiceSnapshotsByServiceIds([
            service._id,
        ]);
        const serviceSubServices = subServiceMap.get(service._id.toString()) ?? [];
        /**
         * Main service is also represented
         * inside selectedServices for consistent
         * frontend response structure.
         *
         * IMPORTANT:
         * These prices are initially 0 because
         * SERVICE cart pricing comes from
         * selectedComponents, not selectedServices.
         */
        const selectedServices = [
            {
                serviceId: service._id,
                name: service.name,
                subServices: serviceSubServices,
                priceBeforeDiscount: 0,
                discountAmount: 0,
                price: 0,
            },
        ];
        const cart = await Cart.create({
            ...ownerQuery,
            /**
             * Root serviceId remains the source
             * of truth for SERVICE cart type.
             */
            serviceId: service._id,
            name: service.name,
            thumbnailImage: service.thumbnailImage ?? "",
            categoryId: service.categoryId,
            tierId,
            tierName: tier.name,
            locationId,
            locationName: location.name,
            /**
             * Main service + all its sub-service steps.
             */
            selectedServices,
            /**
             * Actual selectable/priceable service
             * components remain here.
             */
            selectedComponents: [],
            addonComponents: [],
            /**
             * Package/service addons remain separate.
             */
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
    static async createPackageCart(owner, payload) {
        const { packageId, tierId, locationId, } = payload;
        if (!Types.ObjectId.isValid(packageId) ||
            !Types.ObjectId.isValid(tierId) ||
            !Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid packageId, tierId, or locationId");
        }
        const pkg = await Package.findById(packageId);
        if (!pkg ||
            !pkg.isActive ||
            !pkg.isComplete) {
            throw new Error("Package is not available");
        }
        const tier = pkg.tiers.find((item) => item.tierId.toString() ===
            tierId);
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
        /**
         * Required services are automatically
         * part of the package.
         *
         * Related services remain addons.
         */
        const requiredServices = (packageTierMap.services ?? []).filter((service) => service.isRequired &&
            !service.isRelated);
        if (requiredServices.length === 0) {
            throw new Error("Package has no required services configured");
        }
        const requiredServiceIds = requiredServices.map((service) => service.serviceId);
        /**
         * Fetch pricing.
         */
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
        /**
         * Validate pricing for every required service.
         */
        for (const service of requiredServices) {
            const serviceId = service.serviceId.toString();
            if (!pricingMap.has(serviceId)) {
                throw new Error(`Pricing not found for required service: ${service.name}`);
            }
        }
        /**
         * Fetch ALL active sub-service steps
         * for ALL required package services.
         *
         * Only one MongoDB query is performed.
         */
        const subServiceMap = await this.getSubServiceSnapshotsByServiceIds(requiredServiceIds);
        /**
         * Build package service snapshots.
         *
         * Each service now contains:
         *
         * subServices: [...]
         */
        const selectedServices = requiredServices.map((service) => {
            const serviceId = service.serviceId.toString();
            const pricing = pricingMap.get(serviceId);
            return {
                serviceId: service.serviceId,
                name: service.name,
                subServices: subServiceMap.get(serviceId) ?? [],
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
            status: {
                $in: [
                    "ACTIVE",
                    "SCHEDULED",
                ],
            },
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
            /**
             * Each selected service already has
             * all SubServiceComponent snapshots.
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
            const statuses = filters.status.split(",").map((s) => s.trim());
            query.status = { $in: statuses };
        }
        else {
            query.status = {
                $nin: ["EXPIRED", "DELETED"],
            };
        }
        const parsedPage = Number(filters.page);
        const parsedLimit = Number(filters.limit);
        const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
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
                isActive: true,
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
                isActive: true,
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
                const matchedItem = allowedItems.find((item) => item.itemId.toString() === selectedItemId.toString());
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
        const { serviceIds, } = payload;
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
        /**
         * Validate every supplied ID first.
         */
        for (const serviceId of serviceIds) {
            if (!Types.ObjectId.isValid(serviceId)) {
                throw new Error(`Invalid serviceId: ${serviceId}`);
            }
        }
        const packageTierMap = await PackageTierMap.findOne({
            packageId: cart.packageId,
            tierId: cart.tierId,
        }).lean();
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        const allowedServices = packageTierMap.services ?? [];
        /**
         * Required non-related package services
         * cannot be removed.
         */
        const requiredServiceIds = allowedServices
            .filter((service) => service.isRequired &&
            !service.isRelated)
            .map((service) => service.serviceId.toString());
        const selectedServiceIdSet = new Set(serviceIds.map((serviceId) => serviceId.toString()));
        const missingRequiredServices = requiredServiceIds.filter((serviceId) => !selectedServiceIdSet.has(serviceId));
        if (missingRequiredServices.length >
            0) {
            throw new Error("All required package services must be selected");
        }
        /**
         * Pricing for selected services.
         */
        const pricingList = await PackageTierPricing.find({
            packageId: cart.packageId,
            tierId: cart.tierId,
            locationId: cart.locationId,
            serviceId: {
                $in: serviceIds,
            },
        }).lean();
        const pricingMap = new Map(pricingList.map((pricing) => [
            pricing.serviceId.toString(),
            pricing.finalPrice,
        ]));
        /**
         * Convert IDs to ObjectIds so the
         * helper gets strongly typed IDs.
         */
        const requestedServiceObjectIds = serviceIds.map((serviceId) => new Types.ObjectId(serviceId.toString()));
        /**
         * Fetch all service steps in ONE query.
         */
        const subServiceMap = await this.getSubServiceSnapshotsByServiceIds(requestedServiceObjectIds);
        const selectedServices = [];
        for (const serviceId of serviceIds) {
            const serviceIdString = serviceId.toString();
            const matchedService = allowedServices.find((service) => service.serviceId.toString() ===
                serviceIdString);
            if (!matchedService) {
                throw new Error("Invalid service selected");
            }
            if (matchedService.isRelated) {
                throw new Error(`${matchedService.name} is an addon service. Use updateAddonServices instead.`);
            }
            const price = pricingMap.get(serviceIdString);
            if (price === undefined) {
                throw new Error(`Pricing not found for service ${matchedService.name}`);
            }
            selectedServices.push({
                serviceId: matchedService.serviceId,
                name: matchedService.name,
                /**
                 * Backend automatically inserts
                 * every active service step.
                 */
                subServices: subServiceMap.get(serviceIdString) ?? [],
                priceBeforeDiscount: price,
                discountAmount: 0,
                price,
            });
        }
        cart.selectedServices =
            selectedServices;
        await Cart.updateOne({
            _id: cart._id,
        }, {
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
        const { serviceIds, } = payload;
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
        /**
         * Validate IDs before querying.
         */
        for (const serviceId of serviceIds) {
            if (!Types.ObjectId.isValid(serviceId)) {
                throw new Error(`Invalid serviceId: ${serviceId}`);
            }
        }
        const packageTierMap = await PackageTierMap.findOne({
            packageId: cart.packageId,
            tierId: cart.tierId,
        }).lean();
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        const allowedServices = packageTierMap.services ?? [];
        /**
         * Get pricing for requested addons.
         */
        const pricingList = await PackageTierPricing.find({
            packageId: cart.packageId,
            tierId: cart.tierId,
            locationId: cart.locationId,
            serviceId: {
                $in: serviceIds,
            },
        }).lean();
        const pricingMap = new Map(pricingList.map((pricing) => [
            pricing.serviceId.toString(),
            pricing.finalPrice,
        ]));
        const requestedServiceObjectIds = serviceIds.map((serviceId) => new Types.ObjectId(serviceId.toString()));
        /**
         * Fetch ALL active SubServiceComponents
         * for all addon services in ONE query.
         */
        const subServiceMap = await this.getSubServiceSnapshotsByServiceIds(requestedServiceObjectIds);
        const addonServices = [];
        for (const serviceId of serviceIds) {
            const serviceIdString = serviceId.toString();
            const matchedService = allowedServices.find((service) => service.serviceId.toString() ===
                serviceIdString);
            if (!matchedService) {
                throw new Error("Invalid addon service selected");
            }
            /**
             * Only related non-required services
             * can be addons.
             */
            if (matchedService.isRequired ||
                !matchedService.isRelated) {
                throw new Error(`${matchedService.name} is not an addon service.`);
            }
            const price = pricingMap.get(serviceIdString);
            if (price === undefined) {
                throw new Error(`Pricing not found for service ${matchedService.name}`);
            }
            addonServices.push({
                serviceId: matchedService.serviceId,
                name: matchedService.name,
                /**
                 * Automatically included.
                 */
                subServices: subServiceMap.get(serviceIdString) ?? [],
                priceBeforeDiscount: price,
                discountAmount: 0,
                price,
            });
        }
        cart.addonServices =
            addonServices;
        await Cart.updateOne({
            _id: cart._id,
        }, {
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
        const { scheduledDate, scheduledTime } = payload;
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error("Invalid cartId");
        }
        if (typeof scheduledDate !== "string" || !scheduledDate.trim()) {
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
        if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
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
        cart.schedulingTimezone = "Asia/Kolkata";
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
        if (bookingFor && !["MYSELF", "OTHER"].includes(bookingFor)) {
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
        if (notes !== undefined && typeof notes !== "string") {
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
        if (cart.status === "CHECKOUT_PENDING" && options?.persist) {
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
        if (cart.couponId &&
            cart.couponCode) {
            try {
                const validation = await CouponService.validateCoupon({
                    couponCode: cart.couponCode,
                    ...(cart.serviceId && {
                        serviceId: cart.serviceId.toString(),
                    }),
                    ...(cart.packageId && {
                        packageId: cart.packageId.toString(),
                    }),
                    orderAmount: grossTotals.subtotal,
                    ...(cart.userId && {
                        userId: cart.userId.toString(),
                    }),
                });
                couponDiscountAmount =
                    validation.discountAmount;
            }
            catch {
                changes.push(`Coupon ${cart.couponCode} was removed because it is no longer valid`);
                cart.set("couponId", undefined);
                cart.set("couponCode", undefined);
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
        if (oldValues.discountAmount !== cart.discountAmount) {
            changes.push(`Discount changed from ${oldValues.discountAmount} to ${cart.discountAmount}`);
        }
        if (oldValues.totalTax !== cart.taxSummary.totalTax) {
            changes.push(`Tax changed from ${oldValues.totalTax} to ${cart.taxSummary.totalTax}`);
        }
        if (oldValues.totalAmount !== cart.totalAmount) {
            changes.push(`Total amount changed from ${oldValues.totalAmount} to ${cart.totalAmount}`);
        }
        if (options?.persist) {
            await cart.save(session ? { session } : undefined);
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
            else if (!service.isActive ||
                !service.isComplete) {
                errors.push("Service is no longer available");
            }
            else {
                const tierExists = service.tiers.some((tier) => tier.tierId.toString() === cart.tierId.toString());
                const selectedLocation = service.locations.find((location) => location.locationId.toString() ===
                    cart.locationId.toString());
                const locationExists = Boolean(selectedLocation?.isActive);
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
                        $in: ["ACTIVE", "SCHEDULED", "CHECKOUT_PENDING"],
                    },
                }, null, { session });
                if (!cart) {
                    throw new Error("Cart not found");
                }
                /**
                 * Reuse checkout booking.
                 */
                if (cart.status === "CHECKOUT_PENDING" &&
                    cart.activeBookingId &&
                    cart.checkoutExpiresAt &&
                    cart.checkoutExpiresAt > new Date()) {
                    const existingBooking = await Booking.findOne({
                        _id: cart.activeBookingId,
                        userId,
                        cartId: cart._id,
                        isDeleted: false,
                    }).session(session);
                    if (existingBooking &&
                        existingBooking.payment.status !== "PAID") {
                        return existingBooking;
                    }
                }
                if (cart.status === "CHECKOUT_PENDING" &&
                    (!cart.checkoutExpiresAt ||
                        cart.checkoutExpiresAt <= new Date())) {
                    cart.status = "ACTIVE";
                    cart.set({
                        checkoutExpiresAt: undefined,
                        activeBookingId: undefined,
                        checkedOutAt: undefined,
                        convertedToBookingAt: undefined,
                    });
                    await cart.save({ session });
                }
                if (!cart.scheduledAt) {
                    throw new Error("Scheduled date not set");
                }
                const validation = await this.validateCart({ userId }, cartId, true, session);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(", "));
                }
                const expiry = new Date(Date.now() + 30 * 60 * 1000);
                const lockedCart = await Cart.findOneAndUpdate({
                    _id: cartId,
                    userId,
                    status: {
                        $in: ["ACTIVE", "SCHEDULED"],
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
                const bookingData = await BookingBuilder.buildFromCart(lockedCart);
                const bookingPayload = {
                    userId: new mongoose.Types.ObjectId(userId),
                    cartId: lockedCart._id,
                    bookingFor: lockedCart.bookingFor,
                    bookedBy: "USER",
                    /*
                     * Booking-level snapshots.
                     *
                     * Frontend can access these directly
                     * without searching inside entries.
                     */
                    tierSnapshot: {
                        tierId: lockedCart.tierId,
                        name: lockedCart.tierName,
                    },
                    locationSnapshot: {
                        locationId: lockedCart.locationId,
                        name: lockedCart.locationName,
                    },
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
                const [createdBooking] = await Booking.create([bookingPayload], {
                    session,
                });
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
            if (finalBooking.payment.status === "PAID") {
                return {
                    bookingId: finalBooking._id,
                    bookingReference: finalBooking.bookingReference,
                    totalAmount: finalBooking.pricing.grandTotal,
                    paymentCompleted: true,
                };
            }
            /**
             * Existing Cashfree order can be reused.
             */
            if (finalBooking.payment.providerOrderId &&
                finalBooking.payment.paymentSessionId) {
                return {
                    bookingId: finalBooking._id,
                    bookingReference: finalBooking.bookingReference,
                    totalAmount: finalBooking.pricing.grandTotal,
                    providerOrderId: finalBooking.payment.providerOrderId,
                    paymentSessionId: finalBooking.payment.paymentSessionId,
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
                amount: finalBooking.pricing.grandTotal,
                customerName: finalBooking.customerDetails?.name || "Customer",
                customerEmail: finalBooking.customerDetails?.email || "",
                customerPhone: finalBooking.customerDetails?.phone || "",
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
                    "payment.paymentSessionId": cashfreeOrder.payment_session_id,
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
                totalAmount: finalBooking.pricing.grandTotal,
                providerOrderId: cashfreeOrder.order_id,
                paymentSessionId: cashfreeOrder.payment_session_id,
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
                    status: {
                        $in: [
                            "ACTIVE",
                            "SCHEDULED",
                        ],
                    },
                })
                    .select("_id serviceId packageId tierId locationId")
                    .session(session);
                const duplicateGuestCartIds = [];
                for (const cart of guestCarts) {
                    const duplicateQuery = {
                        userId,
                        tierId: cart.tierId,
                        locationId: cart.locationId,
                        status: {
                            $in: [
                                "ACTIVE",
                                "SCHEDULED",
                            ],
                        },
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
                    status: {
                        $in: [
                            "ACTIVE",
                            "SCHEDULED",
                        ],
                    },
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
        if (typeof cart.subtotal !== "number" || !Number.isFinite(cart.subtotal)) {
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
        cart.set("couponId", undefined);
        cart.set("couponCode", undefined);
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
        if (cart.checkoutExpiresAt && cart.checkoutExpiresAt > new Date()) {
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
    static async expirePendingCheckouts() {
        const now = new Date();
        const result = await Cart.updateMany({
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
                checkedOutAt: 1,
                convertedToBookingAt: 1,
            },
        });
        return {
            matched: result.matchedCount,
            modified: result.modifiedCount,
        };
    }
    static async exportCartsToCsv(cartIds) {
        if (!Array.isArray(cartIds) ||
            cartIds.length === 0) {
            throw new Error("At least one cart ID is required");
        }
        /*
         * Protect the service even if it is
         * called somewhere other than the route.
         */
        const uniqueCartIds = [
            ...new Set(cartIds.map((id) => id.toString())),
        ];
        const invalidId = uniqueCartIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidId) {
            throw new Error("One or more cart IDs are invalid");
        }
        const carts = await Cart.find({
            _id: {
                $in: uniqueCartIds,
            },
        })
            .sort({
            createdAt: -1,
        })
            .lean();
        if (carts.length === 0) {
            throw new Error("No carts found for export");
        }
        const escapeCsv = (value) => {
            if (value === null ||
                value === undefined) {
                return "";
            }
            const stringValue = String(value);
            if (stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n") ||
                stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const formatDate = (value) => {
            if (!value) {
                return "";
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "";
            }
            return date.toISOString();
        };
        const formatComponents = (components) => {
            if (!Array.isArray(components) ||
                components.length === 0) {
                return "";
            }
            return components
                .map((component) => {
                const items = component.items
                    ?.map((item) => item.name ||
                    item.itemId?.toString() ||
                    "")
                    .filter(Boolean)
                    .join(" | ") ??
                    "";
                const componentName = component.name ||
                    component.componentId?.toString() ||
                    "";
                const itemText = items
                    ? ` [${items}]`
                    : "";
                return (`${componentName}${itemText}` +
                    ` (₹${component.totalPrice ?? 0})`);
            })
                .join("; ");
        };
        const formatServices = (services) => {
            if (!Array.isArray(services) ||
                services.length === 0) {
                return "";
            }
            return services
                .map((service) => {
                const name = service.name ||
                    service.serviceId?.toString() ||
                    "";
                return (`${name}` +
                    ` (₹${service.price ?? 0})`);
            })
                .join("; ");
        };
        const headers = [
            "Cart ID",
            "Cart Type",
            "User ID",
            "Guest ID",
            "Service ID",
            "Package ID",
            "Name",
            "Category ID",
            "Tier ID",
            "Tier Name",
            "Location ID",
            "Location Name",
            "Booking For",
            "Customer Name",
            "Customer Email",
            "Customer Phone",
            "Customer Address",
            "Selected Components",
            "Addon Components",
            "Selected Services",
            "Addon Services",
            "Coupon ID",
            "Coupon Code",
            "Base Price",
            "Addon Price",
            "Subtotal",
            "Discount Amount",
            "Taxable Amount",
            "CGST",
            "SGST",
            "IGST",
            "Total Tax",
            "Total Amount",
            "Scheduled At",
            "Scheduling Timezone",
            "Status",
            "Active Booking ID",
            "Notes",
            "Created At",
            "Updated At",
            "Checked Out At",
            "Checkout Expires At",
            "Converted To Booking At",
        ];
        const rows = carts.map((cart) => [
            cart._id?.toString() ?? "",
            cart.serviceId
                ? "SERVICE"
                : cart.packageId
                    ? "PACKAGE"
                    : "",
            cart.userId?.toString() ??
                "",
            cart.guestId ??
                "",
            cart.serviceId?.toString() ??
                "",
            cart.packageId?.toString() ??
                "",
            cart.name,
            cart.categoryId?.toString() ??
                "",
            cart.tierId?.toString() ??
                "",
            cart.tierName,
            cart.locationId?.toString() ??
                "",
            cart.locationName,
            cart.bookingFor,
            cart.customerDetails?.name ??
                "",
            cart.customerDetails?.email ??
                "",
            cart.customerDetails?.phone ??
                "",
            cart.customerDetails?.address ??
                "",
            formatComponents(cart.selectedComponents),
            formatComponents(cart.addonComponents),
            formatServices(cart.selectedServices),
            formatServices(cart.addonServices),
            cart.couponId?.toString() ??
                "",
            cart.couponCode ??
                "",
            cart.basePrice,
            cart.addonPrice,
            cart.subtotal,
            cart.discountAmount,
            cart.taxSummary
                ?.taxableAmount ??
                0,
            cart.taxSummary
                ?.cgstAmount ??
                0,
            cart.taxSummary
                ?.sgstAmount ??
                0,
            cart.taxSummary
                ?.igstAmount ??
                0,
            cart.taxSummary
                ?.totalTax ??
                0,
            cart.totalAmount,
            formatDate(cart.scheduledAt),
            cart.schedulingTimezone ??
                "",
            cart.status,
            cart.activeBookingId
                ?.toString() ??
                "",
            cart.notes ??
                "",
            formatDate(cart.createdAt),
            formatDate(cart.updatedAt),
            formatDate(cart.checkedOutAt),
            formatDate(cart.checkoutExpiresAt),
            formatDate(cart.convertedToBookingAt),
        ]);
        const csv = [
            headers
                .map(escapeCsv)
                .join(","),
            ...rows.map((row) => row
                .map(escapeCsv)
                .join(",")),
        ].join("\n");
        return {
            csv,
            total: carts.length,
        };
    }
}
export default CartService;
//# sourceMappingURL=cart.service.js.map