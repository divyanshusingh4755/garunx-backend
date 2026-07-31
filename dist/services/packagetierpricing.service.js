import mongoose, { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { TaxProfile } from "../models/tax-profile.model.js";
import { PackageCascadingEngine } from "./package-cascading-engine.service.js";
export class PackageTierPricingService {
    static roundMoney(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
    static async bulkUpsertTierPricing(payload) {
        const { packageId, tierId, pricing } = payload;
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        if (!Array.isArray(pricing) || pricing.length === 0) {
            throw new Error("Pricing array is required");
        }
        const pkg = await Package.findById(packageId);
        if (!pkg) {
            throw new Error("Package not found");
        }
        const tierExists = pkg.tiers.some((tier) => tier.tierId.toString() === tierId);
        if (!tierExists) {
            throw new Error("Tier does not belong to package");
        }
        const packageLocationIds = new Set(pkg.locations.map((location) => location.locationId.toString()));
        const allServiceIds = new Set();
        const allTaxProfileIds = new Set();
        const requestLocationIds = new Set();
        for (const locationPricing of pricing) {
            const locationId = locationPricing.locationId?.toString();
            if (!Types.ObjectId.isValid(locationId)) {
                throw new Error(`Invalid locationId: ${locationPricing.locationId}`);
            }
            if (!packageLocationIds.has(locationId)) {
                throw new Error(`Location ${locationId} does not belong to package`);
            }
            if (requestLocationIds.has(locationId)) {
                throw new Error(`Duplicate location found in pricing: ${locationId}`);
            }
            requestLocationIds.add(locationId);
            if (!Array.isArray(locationPricing.services) ||
                locationPricing.services.length === 0) {
                throw new Error(`Services array is required for location ${locationId}`);
            }
            const locationServiceIds = new Set();
            for (const servicePricing of locationPricing.services) {
                const serviceId = servicePricing.serviceId?.toString();
                const taxProfileId = servicePricing.taxProfileId?.toString();
                if (!Types.ObjectId.isValid(serviceId)) {
                    throw new Error(`Invalid serviceId: ${servicePricing.serviceId}`);
                }
                if (locationServiceIds.has(serviceId)) {
                    throw new Error(`Duplicate service ${serviceId} for location ${locationId}`);
                }
                locationServiceIds.add(serviceId);
                allServiceIds.add(serviceId);
                if (!Types.ObjectId.isValid(taxProfileId)) {
                    throw new Error(`Invalid taxProfileId for service ${serviceId}`);
                }
                allTaxProfileIds.add(taxProfileId);
                const taxPriceMode = servicePricing.taxPriceMode ?? "EXCLUSIVE";
                if (!["EXCLUSIVE", "INCLUSIVE"].includes(taxPriceMode)) {
                    throw new Error(`Invalid taxPriceMode for service ${serviceId}`);
                }
                const hasFixedPrice = typeof servicePricing.fixedPrice === "number";
                const hasDiscountPercent = typeof servicePricing.discountPercent === "number";
                if (hasFixedPrice && hasDiscountPercent) {
                    throw new Error(`Service ${serviceId} cannot have both fixedPrice and discountPercent`);
                }
                if (!hasFixedPrice && !hasDiscountPercent) {
                    throw new Error(`Service ${serviceId} requires fixedPrice or discountPercent`);
                }
                if (hasFixedPrice && servicePricing.fixedPrice < 0) {
                    throw new Error(`fixedPrice cannot be negative for service ${serviceId}`);
                }
                if (hasDiscountPercent &&
                    (servicePricing.discountPercent < 0 ||
                        servicePricing.discountPercent > 100)) {
                    throw new Error(`discountPercent must be between 0 and 100 for service ${serviceId}`);
                }
            }
        }
        const serviceObjectIds = Array.from(allServiceIds).map((serviceId) => new Types.ObjectId(serviceId));
        const taxProfileObjectIds = Array.from(allTaxProfileIds).map((taxProfileId) => new Types.ObjectId(taxProfileId));
        const packageTierMap = await PackageTierMap.findOne({
            packageId,
            tierId,
        })
            .select("services")
            .lean();
        if (!packageTierMap) {
            throw new Error("Package tier service mapping is not configured");
        }
        const validServiceIds = new Set((packageTierMap.services ?? []).map((service) => service.serviceId.toString()));
        for (const serviceId of allServiceIds) {
            if (!validServiceIds.has(serviceId)) {
                throw new Error(`Service ${serviceId} does not belong to this package tier`);
            }
        }
        const taxProfiles = await TaxProfile.find({
            _id: { $in: taxProfileObjectIds },
            isActive: true,
        })
            .select("_id")
            .lean();
        if (taxProfiles.length !== taxProfileObjectIds.length) {
            throw new Error("One or more tax profiles are invalid or inactive");
        }
        const basePricingRows = await ServicePricing.find({
            serviceId: { $in: serviceObjectIds },
            tierId,
            locationId: {
                $in: Array.from(requestLocationIds).map((locationId) => new Types.ObjectId(locationId)),
            },
        })
            .select("serviceId componentId locationId price")
            .lean();
        const basePriceMap = new Map();
        for (const pricingRow of basePricingRows) {
            const key = `${pricingRow.locationId.toString()}_` +
                `${pricingRow.serviceId.toString()}`;
            const currentTotal = basePriceMap.get(key) ?? 0;
            basePriceMap.set(key, this.roundMoney(currentTotal + pricingRow.price));
        }
        const bulkOperations = [];
        const requestKeys = new Set();
        for (const locationPricing of pricing) {
            const locationId = locationPricing.locationId.toString();
            for (const servicePricing of locationPricing.services) {
                const { serviceId, fixedPrice, discountPercent, taxProfileId, } = servicePricing;
                const taxPriceMode = servicePricing.taxPriceMode ?? "EXCLUSIVE";
                const requestKey = `${locationId}_${serviceId}`;
                const basePrice = basePriceMap.get(requestKey);
                if (basePrice === undefined) {
                    throw new Error(`Base pricing is missing for service ${serviceId} at location ${locationId}`);
                }
                let finalPrice = basePrice;
                if (typeof fixedPrice === "number") {
                    finalPrice = fixedPrice;
                }
                else if (typeof discountPercent === "number") {
                    finalPrice =
                        basePrice - (basePrice * discountPercent) / 100;
                }
                finalPrice = this.roundMoney(finalPrice);
                if (finalPrice < 0) {
                    throw new Error(`Invalid final price for service ${serviceId}`);
                }
                requestKeys.add(requestKey);
                bulkOperations.push({
                    updateOne: {
                        filter: {
                            packageId: new Types.ObjectId(packageId),
                            tierId: new Types.ObjectId(tierId),
                            locationId: new Types.ObjectId(locationId),
                            serviceId: new Types.ObjectId(serviceId),
                        },
                        update: {
                            $set: {
                                basePrice,
                                fixedPrice: typeof fixedPrice === "number" ? fixedPrice : null,
                                discountPercent: typeof discountPercent === "number"
                                    ? discountPercent
                                    : null,
                                finalPrice,
                                taxProfileId: new Types.ObjectId(taxProfileId),
                                taxPriceMode,
                            },
                        },
                        upsert: true,
                    },
                });
            }
        }
        const retainedRows = Array.from(requestKeys).map((key) => {
            const [locationId, serviceId] = key.split("_");
            return {
                locationId: new Types.ObjectId(locationId),
                serviceId: new Types.ObjectId(serviceId),
            };
        });
        const deletionQuery = {
            packageId: new Types.ObjectId(packageId),
            tierId: new Types.ObjectId(tierId),
        };
        if (retainedRows.length > 0) {
            deletionQuery.$nor = retainedRows;
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            await PackageTierPricing.deleteMany(deletionQuery).session(session);
            if (bulkOperations.length > 0) {
                await PackageTierPricing.bulkWrite(bulkOperations, {
                    session,
                    ordered: true,
                });
            }
            await session.commitTransaction();
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
        await PackageCascadingEngine.run(packageId);
        return {
            success: true,
            message: "Package tier pricing updated successfully",
        };
    }
    static async resolvePricing(packageId, tierId, locationId) {
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        if (!Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid locationId");
        }
        const pkg = await Package.findById(packageId).lean();
        if (!pkg) {
            throw new Error("Package not found");
        }
        if (!pkg.isActive) {
            throw new Error("Package is inactive");
        }
        const tier = pkg.tiers.find((item) => item.tierId.toString() === tierId);
        if (!tier) {
            throw new Error("Tier does not belong to package");
        }
        const location = pkg.locations.find((item) => item.locationId.toString() === locationId);
        if (!location) {
            throw new Error("Location does not belong to package");
        }
        if (!location.isActive) {
            throw new Error("Location is inactive for this package");
        }
        const packageTierMap = await PackageTierMap.findOne({
            packageId,
            tierId,
        })
            .populate({
            path: "services.serviceId",
            select: "name shortDescription thumbnailImage isActive isComplete",
        })
            .lean();
        if (!packageTierMap) {
            throw new Error("Package tier service mapping is not configured");
        }
        const serviceList = (packageTierMap.services ?? [])
            .filter((mappedService) => {
            return (mappedService.serviceId &&
                mappedService.serviceId.isActive &&
                mappedService.serviceId.isComplete);
        })
            .map((mappedService) => ({
            serviceId: mappedService.serviceId._id.toString(),
            name: mappedService.serviceId.name,
            shortDescription: mappedService.serviceId.shortDescription,
            thumbnailImage: mappedService.serviceId.thumbnailImage,
            isRequired: mappedService.isRequired,
            isRelated: mappedService.isRelated,
        }));
        const serviceIds = serviceList.map((service) => new Types.ObjectId(service.serviceId));
        const basePricingRows = await ServicePricing.find({
            serviceId: { $in: serviceIds },
            tierId,
            locationId,
        })
            .select("serviceId componentId price")
            .lean();
        const basePriceMap = new Map();
        for (const pricingRow of basePricingRows) {
            const serviceId = pricingRow.serviceId.toString();
            const currentPrice = basePriceMap.get(serviceId) ?? 0;
            basePriceMap.set(serviceId, this.roundMoney(currentPrice + pricingRow.price));
        }
        const packagePricingRows = await PackageTierPricing.find({
            packageId,
            tierId,
            locationId,
        })
            .populate({
            path: "taxProfileId",
            select: "name code treatment totalRate isActive",
        })
            .lean();
        const packagePricingMap = new Map(packagePricingRows.map((pricingRow) => [
            pricingRow.serviceId.toString(),
            {
                basePrice: pricingRow.basePrice,
                fixedPrice: pricingRow.fixedPrice,
                discountPercent: pricingRow.discountPercent,
                finalPrice: pricingRow.finalPrice,
                taxProfile: pricingRow.taxProfileId,
                taxPriceMode: pricingRow.taxPriceMode,
            },
        ]));
        const resolvedServices = serviceList.map((service) => {
            const basePrice = basePriceMap.get(service.serviceId) ?? null;
            const packagePricing = packagePricingMap.get(service.serviceId);
            const isPriceConfigured = packagePricing !== undefined &&
                packagePricing.finalPrice !== null &&
                packagePricing.finalPrice !== undefined;
            const isTaxConfigured = Boolean(packagePricing?.taxProfile) &&
                packagePricing?.taxProfile?.isActive === true;
            return {
                ...service,
                basePrice,
                fixedPrice: packagePricing?.fixedPrice ?? null,
                discountPercent: packagePricing?.discountPercent ?? null,
                price: packagePricing?.finalPrice ?? basePrice,
                taxConfiguration: packagePricing
                    ? {
                        taxProfile: packagePricing.taxProfile,
                        taxPriceMode: packagePricing.taxPriceMode,
                    }
                    : null,
                isPriceConfigured,
                isTaxConfigured,
                isFullyConfigured: isPriceConfigured && isTaxConfigured,
            };
        });
        const requiredServices = resolvedServices.filter((service) => service.isRequired);
        const optionalServices = resolvedServices.filter((service) => !service.isRequired);
        const startingPrice = requiredServices.reduce((sum, service) => sum + (service.price ?? 0), 0);
        const isAvailable = requiredServices.length > 0 &&
            requiredServices.every((service) => service.isFullyConfigured);
        return {
            package: {
                id: pkg._id,
                name: pkg.name,
                description: pkg.fullDescription,
            },
            tier: {
                id: tier.tierId,
                name: tier.name,
            },
            location: {
                id: location.locationId,
                name: location.name,
            },
            services: resolvedServices,
            summary: {
                totalServices: resolvedServices.length,
                requiredServiceCount: requiredServices.length,
                optionalServiceCount: optionalServices.length,
                startingPrice: this.roundMoney(startingPrice),
                isAvailable,
            },
        };
    }
}
//# sourceMappingURL=packagetierpricing.service.js.map