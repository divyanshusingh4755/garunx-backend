import mongoose, { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
export class PackageCascadingEngine {
    static async run(packageId) {
        if (!Types.ObjectId.isValid(packageId)) {
            throw new Error("Invalid packageId");
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const packageDocument = await Package.findById(packageId).session(session);
                if (!packageDocument) {
                    throw new Error("Package not found");
                }
                await this.cleanupTierOrphans(packageDocument, session);
                await this.cleanupLocationOrphans(packageDocument, session);
                await this.cleanupMappingOrphans(packageDocument, session);
                await this.cleanupPricing(packageDocument, session);
                const refreshed = await Package.findById(packageId).session(session);
                if (!refreshed) {
                    throw new Error("Package lost during cleanup");
                }
                const [isComplete, startingPrice] = await Promise.all([
                    this.computeIsComplete(refreshed, session),
                    this.computeStartingPrice(refreshed._id, session),
                ]);
                refreshed.isComplete = isComplete;
                refreshed.isActive = isComplete;
                refreshed.startingPrice = startingPrice;
                await refreshed.save({
                    session,
                });
            });
        }
        finally {
            await session.endSession();
        }
    }
    static getValidIdStrings(values) {
        return values.map((value) => {
            const id = value.toString();
            if (!Types.ObjectId.isValid(id)) {
                throw new Error(`Invalid ObjectId: ${id}`);
            }
            return id;
        });
    }
    static async cleanupTierOrphans(packageDocument, session) {
        const validTierIds = this.getValidIdStrings(packageDocument.tiers.map((tier) => tier.tierId));
        if (validTierIds.length === 0) {
            await Promise.all([
                PackageTierMap.deleteMany({
                    packageId: packageDocument._id,
                }, {
                    session,
                }),
                PackageTierPricing.deleteMany({
                    packageId: packageDocument._id,
                }, {
                    session,
                }),
            ]);
            return;
        }
        await Promise.all([
            PackageTierMap.deleteMany({
                packageId: packageDocument._id,
                tierId: {
                    $nin: validTierIds,
                },
            }, {
                session,
            }),
            PackageTierPricing.deleteMany({
                packageId: packageDocument._id,
                tierId: {
                    $nin: validTierIds,
                },
            }, {
                session,
            }),
        ]);
    }
    static async cleanupLocationOrphans(packageDocument, session) {
        const validLocationIds = this.getValidIdStrings(packageDocument.locations.map((location) => location.locationId));
        if (validLocationIds.length === 0) {
            await PackageTierPricing.deleteMany({
                packageId: packageDocument._id,
            }, {
                session,
            });
            return;
        }
        await PackageTierPricing.deleteMany({
            packageId: packageDocument._id,
            locationId: {
                $nin: validLocationIds,
            },
        }, {
            session,
        });
    }
    static async cleanupMappingOrphans(packageDocument, session) {
        await PackageTierMap.deleteMany({
            packageId: packageDocument._id,
            $or: [
                {
                    tierId: {
                        $exists: false,
                    },
                },
                {
                    tierId: null,
                },
            ],
        }, {
            session,
        });
    }
    static async cleanupPricing(packageDocument, session) {
        const validTierIds = new Set(this.getValidIdStrings(packageDocument.tiers.map((tier) => tier.tierId)));
        const validLocationIds = new Set(this.getValidIdStrings(packageDocument.locations.map((location) => location.locationId)));
        await PackageTierPricing.deleteMany({
            packageId: packageDocument._id,
            $or: [
                {
                    tierId: {
                        $exists: false,
                    },
                },
                {
                    tierId: null,
                },
                {
                    locationId: {
                        $exists: false,
                    },
                },
                {
                    locationId: null,
                },
                {
                    serviceId: {
                        $exists: false,
                    },
                },
                {
                    serviceId: null,
                },
            ],
        }, {
            session,
        });
        const mappings = await PackageTierMap.find({
            packageId: packageDocument._id,
        })
            .session(session)
            .select("tierId services.serviceId")
            .lean();
        const serviceMapByTier = new Map();
        for (const mapping of mappings) {
            const tierId = mapping.tierId.toString();
            let serviceSet = serviceMapByTier.get(tierId);
            if (!serviceSet) {
                serviceSet = new Set();
                serviceMapByTier.set(tierId, serviceSet);
            }
            for (const service of mapping.services ?? []) {
                serviceSet.add(service.serviceId.toString());
            }
        }
        const pricing = await PackageTierPricing.find({
            packageId: packageDocument._id,
        })
            .session(session)
            .select("tierId locationId serviceId")
            .lean();
        const deleteIds = [];
        for (const pricingRow of pricing) {
            const tierId = pricingRow.tierId.toString();
            const locationId = pricingRow.locationId.toString();
            const serviceId = pricingRow.serviceId.toString();
            const serviceSet = serviceMapByTier.get(tierId);
            if (!validTierIds.has(tierId) ||
                !validLocationIds.has(locationId) ||
                !serviceSet?.has(serviceId)) {
                deleteIds.push(pricingRow._id);
            }
        }
        if (deleteIds.length > 0) {
            await PackageTierPricing.deleteMany({
                _id: {
                    $in: deleteIds,
                },
            }, {
                session,
            });
        }
    }
    static async computeStartingPrice(packageId, session) {
        const [mappings, pricingRows] = await Promise.all([
            PackageTierMap.find({
                packageId,
            })
                .session(session)
                .select("tierId services.serviceId services.isRequired")
                .lean(),
            PackageTierPricing.find({
                packageId,
            })
                .session(session)
                .select("tierId locationId serviceId finalPrice")
                .lean(),
        ]);
        /*
         * Store the required service IDs for every tier.
         */
        const requiredServicesByTier = new Map();
        for (const mapping of mappings) {
            const tierId = mapping.tierId.toString();
            const requiredServiceIds = new Set((mapping.services ?? [])
                .filter((service) => service.isRequired)
                .map((service) => service.serviceId.toString()));
            requiredServicesByTier.set(tierId, requiredServiceIds);
        }
        /*
         * Group pricing by tier and location.
         */
        const pricingByTierLocation = new Map();
        for (const pricing of pricingRows) {
            const tierId = pricing.tierId.toString();
            const locationId = pricing.locationId.toString();
            const serviceId = pricing.serviceId.toString();
            const key = `${tierId}_${locationId}`;
            let servicePrices = pricingByTierLocation.get(key);
            if (!servicePrices) {
                servicePrices = new Map();
                pricingByTierLocation.set(key, servicePrices);
            }
            servicePrices.set(serviceId, pricing.finalPrice);
        }
        const availableStartingPrices = [];
        for (const [key, servicePrices] of pricingByTierLocation) {
            const separatorIndex = key.indexOf("_");
            const tierId = key.slice(0, separatorIndex);
            const requiredServiceIds = requiredServicesByTier.get(tierId);
            /*
             * Your resolvePricing() considers only
             * isRequired services for starting price.
             */
            if (!requiredServiceIds || requiredServiceIds.size === 0) {
                continue;
            }
            const hasAllRequiredPrices = [...requiredServiceIds].every((serviceId) => servicePrices.has(serviceId));
            if (!hasAllRequiredPrices) {
                continue;
            }
            const totalPrice = [...requiredServiceIds].reduce((total, serviceId) => total + (servicePrices.get(serviceId) ?? 0), 0);
            availableStartingPrices.push(Math.round((totalPrice + Number.EPSILON) * 100) / 100);
        }
        if (availableStartingPrices.length === 0) {
            return 0;
        }
        return Math.min(...availableStartingPrices);
    }
    static async computeIsComplete(packageDocument, session) {
        const mappings = await PackageTierMap.find({
            packageId: packageDocument._id,
        })
            .session(session)
            .select("tierId services.serviceId")
            .lean();
        const pricing = await PackageTierPricing.find({
            packageId: packageDocument._id,
        })
            .session(session)
            .select("tierId locationId serviceId")
            .lean();
        const activeLocations = packageDocument.locations.filter((location) => location.isActive);
        if (activeLocations.length === 0 ||
            packageDocument.tiers.length === 0 ||
            mappings.length === 0) {
            return false;
        }
        const mappingsByTier = new Map();
        for (const mapping of mappings) {
            const tierId = mapping.tierId.toString();
            let services = mappingsByTier.get(tierId);
            if (!services) {
                services = new Set();
                mappingsByTier.set(tierId, services);
            }
            for (const service of mapping.services ?? []) {
                services.add(service.serviceId.toString());
            }
        }
        const priceSet = new Set(pricing.map((pricingRow) => `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.serviceId.toString()}`));
        for (const tier of packageDocument.tiers) {
            const tierId = tier.tierId.toString();
            const tierServices = mappingsByTier.get(tierId);
            /*
             * Every configured package tier must map at least
             * one service. Skipping an empty tier would allow
             * an incomplete package to become active.
             */
            if (!tierServices || tierServices.size === 0) {
                return false;
            }
            for (const location of activeLocations) {
                const locationId = location.locationId.toString();
                for (const serviceId of tierServices) {
                    const key = `${tierId}_${locationId}_${serviceId}`;
                    if (!priceSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
//# sourceMappingURL=package-cascading-engine.service.js.map