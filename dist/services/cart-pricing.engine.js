import { Types, } from "mongoose";
import { ServicePricing, } from "../models/servicepricing.model.js";
import { PackageTierPricing, } from "../models/packagetierpricing.model.js";
import { ServiceComponent, } from "../models/servicecomponent.model.js";
import { PackageTierMap, } from "../models/packagetiermap.model.js";
import { TaxProfile } from "../models/tax-profile.model.js";
import { TaxCalculatorService, } from "./tax-calculator.service.js";
import { TaxContextService, } from "./tax-context.service.js";
import { taxConfig, } from "../config/tax.config.js";
import { TaxPriceMode, TaxSource, TaxTreatment, } from "../types/tax.types.js";
export class CartPricingEngine {
    static round(value) {
        return (Math.round((value + Number.EPSILON) *
            100) / 100);
    }
    static validateObjectId(value, fieldName) {
        if (!Types.ObjectId.isValid(value.toString())) {
            throw new Error(`Invalid ${fieldName}`);
        }
    }
    static validateMoney(fieldName, value) {
        if (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0) {
            throw new Error(`${fieldName} must be a valid non-negative number`);
        }
        return this.round(value);
    }
    static validateTaxPriceMode(value) {
        if (value ===
            TaxPriceMode.EXCLUSIVE) {
            return TaxPriceMode.EXCLUSIVE;
        }
        if (value ===
            TaxPriceMode.INCLUSIVE) {
            return TaxPriceMode.INCLUSIVE;
        }
        throw new Error(`Invalid tax price mode: ${String(value)}`);
    }
    static ensureUniqueIds(items, getId, label) {
        const seen = new Set();
        for (const item of items) {
            const id = getId(item).toString();
            if (seen.has(id)) {
                throw new Error(`Duplicate ${label}: ${id}`);
            }
            seen.add(id);
        }
    }
    static createUniqueMap(items, getKey, label) {
        const result = new Map();
        for (const item of items) {
            const key = getKey(item);
            if (result.has(key)) {
                throw new Error(`Duplicate ${label}: ${key}`);
            }
            result.set(key, item);
        }
        return result;
    }
    static async loadTaxProfiles(taxProfileIds) {
        const uniqueIds = [
            ...new Set(taxProfileIds
                .filter((id) => id !== null &&
                id !== undefined)
                .map((id) => {
                const stringId = id.toString();
                if (!Types.ObjectId.isValid(stringId)) {
                    throw new Error(`Invalid taxProfileId: ${stringId}`);
                }
                return stringId;
            })),
        ];
        if (uniqueIds.length === 0) {
            return new Map();
        }
        const profiles = await TaxProfile.find({
            _id: {
                $in: uniqueIds.map((id) => new Types.ObjectId(id)),
            },
            isActive: true,
        })
            .select("name code treatment totalRate")
            .lean();
        return new Map(profiles.map((profile) => [
            profile._id.toString(),
            profile,
        ]));
    }
    static emptyTaxSummary() {
        return {
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalTax: 0,
        };
    }
    static addLineTaxToSummary(summary, tax) {
        summary.taxableAmount =
            this.round(summary.taxableAmount +
                tax.taxableAmount);
        summary.cgstAmount =
            this.round(summary.cgstAmount +
                tax.cgstAmount);
        summary.sgstAmount =
            this.round(summary.sgstAmount +
                tax.sgstAmount);
        summary.igstAmount =
            this.round(summary.igstAmount +
                tax.igstAmount);
        summary.totalTax =
            this.round(summary.totalTax +
                tax.totalTax);
    }
    static calculatePricingLine(params) {
        const { pricing, taxProfileMap, supplierStateCode, placeOfSupplyStateCode, source, } = params;
        const normalizedAmount = this.validateMoney("Line amount", params.amount);
        const discountAmount = this.validateMoney("Line discount", params.discountAmount ?? 0);
        if (discountAmount >
            normalizedAmount) {
            throw new Error("Line discount cannot be greater than the line amount");
        }
        const taxProfileId = pricing.taxProfileId ??
            null;
        const taxPriceMode = this.validateTaxPriceMode(pricing.taxPriceMode);
        if (!taxConfig.enabled ||
            !taxProfileId) {
            return {
                amount: normalizedAmount,
                discountAmount,
                finalAmount: this.round(normalizedAmount -
                    discountAmount),
                taxProfileId,
                taxPriceMode,
            };
        }
        if (!supplierStateCode ||
            !placeOfSupplyStateCode) {
            throw new Error("Tax context is required for taxable pricing");
        }
        const taxProfile = taxProfileMap.get(taxProfileId.toString());
        if (!taxProfile) {
            throw new Error(`Active tax profile not found: ${taxProfileId.toString()}`);
        }
        const profileSnapshot = {
            taxProfileId: taxProfile._id,
            name: taxProfile.name,
            code: taxProfile.code,
            treatment: taxProfile.treatment,
            totalRate: taxProfile.totalRate,
            priceMode: taxPriceMode,
            source,
        };
        const tax = TaxCalculatorService
            .calculateLineTax({
            amount: normalizedAmount,
            discountAmount,
            profile: profileSnapshot,
            supplierStateCode,
            placeOfSupplyStateCode,
        });
        return {
            amount: normalizedAmount,
            discountAmount,
            finalAmount: tax.finalAmount,
            taxProfileId,
            taxPriceMode,
            tax,
        };
    }
    static async calculateServiceCart(cart) {
        if (!cart.serviceId) {
            throw new Error("serviceId is required for service cart pricing");
        }
        if (cart.packageId) {
            throw new Error("Service cart cannot contain packageId");
        }
        this.validateObjectId(cart.serviceId, "serviceId");
        this.validateObjectId(cart.tierId, "tierId");
        this.validateObjectId(cart.locationId, "locationId");
        const selectedComponents = (cart.selectedComponents ??
            []);
        const addonComponents = (cart.addonComponents ??
            []);
        this.ensureUniqueIds(selectedComponents, (item) => item.componentId, "selected component");
        this.ensureUniqueIds(addonComponents, (item) => item.componentId, "addon component");
        const selectedIds = new Set(selectedComponents.map((item) => item.componentId
            .toString()));
        for (const addon of addonComponents) {
            const id = addon.componentId
                .toString();
            if (selectedIds.has(id)) {
                throw new Error(`Component cannot be both selected and addon: ${id}`);
            }
        }
        const [serviceComponents, pricingRows,] = await Promise.all([
            ServiceComponent.find({
                serviceId: cart.serviceId,
                tierId: cart.tierId,
            }).lean(),
            ServicePricing.find({
                serviceId: cart.serviceId,
                tierId: cart.tierId,
                locationId: cart.locationId,
            }).lean(),
        ]);
        const pricingMap = this.createUniqueMap(pricingRows, (pricing) => pricing.componentId
            .toString(), "service pricing row for component");
        const serviceComponentMap = this.createUniqueMap(serviceComponents, (component) => component.componentId
            .toString(), "service component");
        const taxProfileMap = await this.loadTaxProfiles(pricingRows.map((pricing) => pricing.taxProfileId));
        let supplierStateCode;
        let placeOfSupplyStateCode;
        if (taxConfig.enabled) {
            const taxContext = await TaxContextService
                .resolveByLocationId(cart.locationId);
            supplierStateCode =
                taxContext
                    .supplierStateCode;
            placeOfSupplyStateCode =
                taxContext
                    .placeOfSupplyStateCode;
        }
        const requiredComponentIds = serviceComponents
            .filter((component) => component.isRequired)
            .map((component) => component.componentId
            .toString());
        const duplicateRequiredIds = requiredComponentIds.filter((id, index) => requiredComponentIds
            .indexOf(id) !== index);
        if (duplicateRequiredIds.length >
            0) {
            throw new Error(`Duplicate required service component: ${duplicateRequiredIds[0]}`);
        }
        const requiredComponentIdSet = new Set(requiredComponentIds);
        const selectedComponentMap = new Map(selectedComponents.map((component) => [
            component.componentId
                .toString(),
            component,
        ]));
        const componentLines = new Map();
        const componentItems = [];
        const taxSummary = this.emptyTaxSummary();
        let basePrice = 0;
        let addonPrice = 0;
        let discountAmount = 0;
        let totalAmount = 0;
        for (const componentId of requiredComponentIds) {
            const pricing = pricingMap.get(componentId);
            if (!pricing) {
                throw new Error(`Pricing not found for required component: ${componentId}`);
            }
            const cartComponent = selectedComponentMap.get(componentId);
            const line = this.calculatePricingLine({
                amount: pricing.price,
                discountAmount: cartComponent
                    ?.discountAmount ??
                    0,
                pricing,
                taxProfileMap,
                ...(supplierStateCode !== undefined
                    ? { supplierStateCode }
                    : {}),
                ...(placeOfSupplyStateCode !== undefined
                    ? { placeOfSupplyStateCode }
                    : {}),
                source: TaxSource
                    .SERVICE_PRICING,
            });
            basePrice =
                this.round(basePrice +
                    line.amount);
            discountAmount =
                this.round(discountAmount +
                    line.discountAmount);
            totalAmount =
                this.round(totalAmount +
                    line.finalAmount);
            if (line.tax) {
                this.addLineTaxToSummary(taxSummary, line.tax);
            }
            componentLines.set(componentId, line);
            const componentConfig = serviceComponentMap.get(componentId);
            componentItems.push({
                componentId: new Types.ObjectId(componentId),
                name: componentConfig?.name ??
                    componentConfig?.componentName ??
                    "",
                priceBeforeDiscount: line.amount,
                discountAmount: line.discountAmount,
                price: line.finalAmount,
                ...(line.tax
                    ? { tax: line.tax }
                    : {}),
            });
        }
        for (const component of selectedComponents) {
            const componentId = component.componentId
                .toString();
            if (requiredComponentIdSet.has(componentId)) {
                continue;
            }
            const pricing = pricingMap.get(componentId);
            if (!pricing) {
                throw new Error(`Pricing not found for selected component: ${componentId}`);
            }
            const line = this.calculatePricingLine({
                amount: pricing.price,
                discountAmount: component.discountAmount ??
                    0,
                pricing,
                taxProfileMap,
                ...(supplierStateCode !== undefined
                    ? { supplierStateCode }
                    : {}),
                ...(placeOfSupplyStateCode !== undefined
                    ? { placeOfSupplyStateCode }
                    : {}),
                source: TaxSource
                    .SERVICE_PRICING,
            });
            basePrice =
                this.round(basePrice +
                    line.amount);
            discountAmount =
                this.round(discountAmount +
                    line.discountAmount);
            totalAmount =
                this.round(totalAmount +
                    line.finalAmount);
            if (line.tax) {
                this.addLineTaxToSummary(taxSummary, line.tax);
            }
            componentLines.set(componentId, line);
            const componentConfig = serviceComponentMap.get(componentId);
            componentItems.push({
                componentId: component.componentId,
                name: componentConfig?.name ??
                    componentConfig?.componentName ??
                    "",
                priceBeforeDiscount: line.amount,
                discountAmount: line.discountAmount,
                price: line.finalAmount,
                ...(line.tax
                    ? { tax: line.tax }
                    : {}),
            });
        }
        for (const component of addonComponents) {
            const componentId = component.componentId
                .toString();
            const pricing = pricingMap.get(componentId);
            if (!pricing) {
                throw new Error(`Pricing not found for addon component: ${componentId}`);
            }
            const line = this.calculatePricingLine({
                amount: pricing.price,
                discountAmount: component.discountAmount ??
                    0,
                pricing,
                taxProfileMap,
                ...(supplierStateCode !== undefined
                    ? { supplierStateCode }
                    : {}),
                ...(placeOfSupplyStateCode !== undefined
                    ? { placeOfSupplyStateCode }
                    : {}),
                source: TaxSource
                    .SERVICE_PRICING,
            });
            addonPrice =
                this.round(addonPrice +
                    line.amount);
            discountAmount =
                this.round(discountAmount +
                    line.discountAmount);
            totalAmount =
                this.round(totalAmount +
                    line.finalAmount);
            if (line.tax) {
                this.addLineTaxToSummary(taxSummary, line.tax);
            }
            componentLines.set(componentId, line);
        }
        const subtotal = this.round(basePrice +
            addonPrice);
        const result = {
            basePrice,
            addonPrice,
            subtotal,
            discountAmount,
            totalAmount,
            taxSummary: {
                ...taxSummary,
            },
            componentLines,
            serviceLines: new Map(),
            componentItems,
            serviceItems: [],
        };
        if (supplierStateCode) {
            result.taxSummary
                .supplierStateCode =
                supplierStateCode;
        }
        if (placeOfSupplyStateCode) {
            result.taxSummary
                .placeOfSupplyStateCode =
                placeOfSupplyStateCode;
        }
        return result;
    }
    static async calculatePackageCart(cart) {
        if (!cart.packageId) {
            throw new Error("packageId is required for package cart pricing");
        }
        if (cart.serviceId) {
            throw new Error("Package cart cannot contain serviceId");
        }
        this.validateObjectId(cart.packageId, "packageId");
        this.validateObjectId(cart.tierId, "tierId");
        this.validateObjectId(cart.locationId, "locationId");
        const selectedServices = (cart.selectedServices ??
            []);
        const addonServices = (cart.addonServices ??
            []);
        this.ensureUniqueIds(selectedServices, (item) => item.serviceId, "selected service");
        this.ensureUniqueIds(addonServices, (item) => item.serviceId, "addon service");
        const selectedIds = new Set(selectedServices.map((item) => item.serviceId
            .toString()));
        for (const addon of addonServices) {
            const id = addon.serviceId
                .toString();
            if (selectedIds.has(id)) {
                throw new Error(`Service cannot be both selected and addon: ${id}`);
            }
        }
        const [packageTierMap, pricingRows,] = await Promise.all([
            PackageTierMap.findOne({
                packageId: cart.packageId,
                tierId: cart.tierId,
            }).lean(),
            PackageTierPricing.find({
                packageId: cart.packageId,
                tierId: cart.tierId,
                locationId: cart.locationId,
            }).lean(),
        ]);
        if (!packageTierMap) {
            throw new Error("Package tier mapping not found");
        }
        const packageServices = packageTierMap.services ??
            [];
        this.ensureUniqueIds(packageServices, (service) => service.serviceId, "package tier service");
        const pricingMap = this.createUniqueMap(pricingRows, (pricing) => pricing.serviceId
            .toString(), "package pricing row for service");
        const taxProfileMap = await this.loadTaxProfiles(pricingRows.map((pricing) => pricing.taxProfileId));
        let supplierStateCode;
        let placeOfSupplyStateCode;
        if (taxConfig.enabled) {
            const taxContext = await TaxContextService
                .resolveByLocationId(cart.locationId);
            supplierStateCode =
                taxContext
                    .supplierStateCode;
            placeOfSupplyStateCode =
                taxContext
                    .placeOfSupplyStateCode;
        }
        const selectedServiceMap = new Map(selectedServices.map((service) => [
            service.serviceId
                .toString(),
            service,
        ]));
        const addonServiceMap = new Map(addonServices.map((service) => [
            service.serviceId
                .toString(),
            service,
        ]));
        const mappedServiceIds = new Set(packageServices.map((service) => service.serviceId
            .toString()));
        for (const selectedService of selectedServices) {
            const id = selectedService
                .serviceId
                .toString();
            if (!mappedServiceIds.has(id)) {
                throw new Error(`Selected service is not part of the package tier: ${id}`);
            }
        }
        for (const addonService of addonServices) {
            const id = addonService.serviceId
                .toString();
            if (!mappedServiceIds.has(id)) {
                throw new Error(`Addon service is not part of the package tier: ${id}`);
            }
        }
        const serviceLines = new Map();
        const serviceItems = [];
        const taxSummary = this.emptyTaxSummary();
        let basePrice = 0;
        let addonPrice = 0;
        let discountAmount = 0;
        let totalAmount = 0;
        for (const service of packageServices) {
            const serviceId = service.serviceId
                .toString();
            const pricing = pricingMap.get(serviceId);
            const selectedService = selectedServiceMap.get(serviceId);
            const addonService = addonServiceMap.get(serviceId);
            if (selectedService &&
                service.isRelated) {
                throw new Error(`Related service must be selected as addon: ${serviceId}`);
            }
            if (addonService &&
                !service.isRelated) {
                throw new Error(`Non-related package service cannot be selected as addon: ${serviceId}`);
            }
            if (!selectedService &&
                !addonService) {
                continue;
            }
            if (!pricing) {
                throw new Error(`Pricing not found for selected package service: ${serviceId}`);
            }
            if (selectedService &&
                !service.isRelated) {
                const line = this.calculatePricingLine({
                    amount: pricing.finalPrice,
                    discountAmount: selectedService
                        .discountAmount ??
                        0,
                    pricing,
                    taxProfileMap,
                    supplierStateCode,
                    placeOfSupplyStateCode,
                    source: TaxSource
                        .PACKAGE_PRICING,
                });
                basePrice =
                    this.round(basePrice +
                        line.amount);
                discountAmount =
                    this.round(discountAmount +
                        line.discountAmount);
                totalAmount =
                    this.round(totalAmount +
                        line.finalAmount);
                if (line.tax) {
                    this.addLineTaxToSummary(taxSummary, line.tax);
                }
                serviceLines.set(serviceId, line);
                serviceItems.push({
                    serviceId: service.serviceId,
                    name: service.name ??
                        service.serviceName ??
                        "",
                    priceBeforeDiscount: line.amount,
                    discountAmount: line.discountAmount,
                    price: line.finalAmount,
                    ...(line.tax
                        ? { tax: line.tax }
                        : {}),
                });
            }
            if (addonService &&
                service.isRelated) {
                const line = this.calculatePricingLine({
                    amount: pricing.finalPrice,
                    discountAmount: addonService
                        .discountAmount ??
                        0,
                    pricing,
                    taxProfileMap,
                    supplierStateCode,
                    placeOfSupplyStateCode,
                    source: TaxSource
                        .PACKAGE_PRICING,
                });
                addonPrice =
                    this.round(addonPrice +
                        line.amount);
                discountAmount =
                    this.round(discountAmount +
                        line.discountAmount);
                totalAmount =
                    this.round(totalAmount +
                        line.finalAmount);
                if (line.tax) {
                    this.addLineTaxToSummary(taxSummary, line.tax);
                }
                serviceLines.set(serviceId, line);
            }
        }
        const subtotal = this.round(basePrice +
            addonPrice);
        const result = {
            basePrice,
            addonPrice,
            subtotal,
            discountAmount,
            totalAmount,
            taxSummary: {
                ...taxSummary,
            },
            componentLines: new Map(),
            serviceLines,
            componentItems: [],
            serviceItems,
        };
        if (supplierStateCode) {
            result.taxSummary
                .supplierStateCode =
                supplierStateCode;
        }
        if (placeOfSupplyStateCode) {
            result.taxSummary
                .placeOfSupplyStateCode =
                placeOfSupplyStateCode;
        }
        return result;
    }
    static async calculateCartTotals(cart) {
        const hasService = Boolean(cart.serviceId);
        const hasPackage = Boolean(cart.packageId);
        if (hasService === hasPackage) {
            throw new Error(hasService
                ? "Cart cannot contain both serviceId and packageId"
                : "Cart must contain either serviceId or packageId");
        }
        return hasService
            ? this.calculateServiceCart(cart)
            : this.calculatePackageCart(cart);
    }
}
//# sourceMappingURL=cart-pricing.engine.js.map