import mongoose, { Types, } from "mongoose";
import { Service } from "../models/service.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Component } from "../models/component.model.js";
export class ServiceCascadingEngine {
    /*
     * Can run:
     *
     * 1. Inside an existing transaction.
     * 2. Standalone with its own transaction.
     *
     * This allows ServiceComponent / Pricing
     * mutations and cascading changes to commit
     * atomically.
     */
    static async run(serviceId, externalSession) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (externalSession) {
            await this.runInSession(serviceId, externalSession);
            return;
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await this.runInSession(serviceId, session);
            });
        }
        finally {
            await session.endSession();
        }
    }
    /*
     * Read-only configuration validation.
     *
     * ServiceService can use this before allowing
     * an admin to activate a service.
     *
     * This uses the SAME completeness definition
     * as the cascading engine.
     */
    static async evaluateConfiguration(serviceId, externalSession) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const query = Service.findById(serviceId)
            .select("_id tiers locations");
        if (externalSession) {
            query.session(externalSession);
        }
        const service = await query.lean();
        if (!service) {
            throw new Error("Service not found");
        }
        return this.evaluateConfigurationForService(service, externalSession);
    }
    static async runInSession(serviceId, session) {
        const service = await Service.findById(serviceId).session(session);
        if (!service) {
            throw new Error("Service not found");
        }
        /*
         * Remove configuration which no longer
         * belongs to the service.
         */
        await this.cleanupTierOrphans(service, session);
        await this.cleanupLocationOrphans(service, session);
        await this.cleanupComponentOrphans(service, session);
        await this.cleanupPricing(service, session);
        /*
         * Re-read because cleanup operations above
         * may have changed dependent configuration.
         */
        const refreshed = await Service.findById(serviceId).session(session);
        if (!refreshed) {
            throw new Error("Service lost during cleanup");
        }
        const evaluation = await this.evaluateConfigurationForService(refreshed, session);
        refreshed.isComplete =
            evaluation.isComplete;
        /*
         * IMPORTANT:
         *
         * Cascading may automatically deactivate
         * an invalid/incomplete service.
         *
         * It must NEVER automatically activate
         * a service merely because configuration
         * became complete.
         *
         * Activation remains an explicit admin action.
         */
        if (!evaluation.isComplete) {
            refreshed.isActive =
                false;
            refreshed.startingPrice =
                0;
        }
        else {
            refreshed.startingPrice =
                await this.computeStartingPrice(refreshed, session);
        }
        await refreshed.save({
            session,
        });
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
    static async cleanupTierOrphans(service, session) {
        const validTierIds = this.getValidIdStrings(service.tiers.map((tier) => tier.tierId));
        if (validTierIds.length === 0) {
            await Promise.all([
                ServiceComponent.deleteMany({
                    serviceId: service._id,
                }, {
                    session,
                }),
                ServicePricing.deleteMany({
                    serviceId: service._id,
                }, {
                    session,
                }),
            ]);
            return;
        }
        await Promise.all([
            ServiceComponent.deleteMany({
                serviceId: service._id,
                tierId: {
                    $nin: validTierIds,
                },
            }, {
                session,
            }),
            ServicePricing.deleteMany({
                serviceId: service._id,
                tierId: {
                    $nin: validTierIds,
                },
            }, {
                session,
            }),
        ]);
    }
    static async cleanupLocationOrphans(service, session) {
        const validLocationIds = this.getValidIdStrings(service.locations.map((location) => location.locationId));
        if (validLocationIds.length === 0) {
            await ServicePricing.deleteMany({
                serviceId: service._id,
            }, {
                session,
            });
            return;
        }
        await ServicePricing.deleteMany({
            serviceId: service._id,
            locationId: {
                $nin: validLocationIds,
            },
        }, {
            session,
        });
    }
    static async cleanupComponentOrphans(service, session) {
        await ServiceComponent.deleteMany({
            serviceId: service._id,
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
                    componentId: {
                        $exists: false,
                    },
                },
                {
                    componentId: null,
                },
            ],
        }, {
            session,
        });
    }
    static async cleanupPricing(service, session) {
        const validTierIds = new Set(this.getValidIdStrings(service.tiers.map((tier) => tier.tierId)));
        const validLocationIds = new Set(this.getValidIdStrings(service.locations.map((location) => location.locationId)));
        /*
         * Remove structurally invalid pricing.
         */
        await ServicePricing.deleteMany({
            serviceId: service._id,
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
                    componentId: {
                        $exists: false,
                    },
                },
                {
                    componentId: null,
                },
            ],
        }, {
            session,
        });
        /*
         * Valid pricing requires a matching
         * ServiceComponent for tier + component.
         */
        const components = await ServiceComponent.find({
            serviceId: service._id,
        })
            .session(session)
            .select("tierId componentId")
            .lean();
        const validComponentKeys = new Set(components.map((component) => `${component.tierId.toString()}_${component.componentId.toString()}`));
        const pricing = await ServicePricing.find({
            serviceId: service._id,
        })
            .session(session)
            .select("_id tierId locationId componentId")
            .lean();
        const deleteIds = [];
        for (const pricingRow of pricing) {
            const tierId = pricingRow.tierId.toString();
            const locationId = pricingRow.locationId.toString();
            const componentId = pricingRow.componentId.toString();
            const componentKey = `${tierId}_${componentId}`;
            if (!validTierIds.has(tierId) ||
                !validLocationIds.has(locationId) ||
                !validComponentKeys.has(componentKey)) {
                deleteIds.push(pricingRow._id);
            }
        }
        if (deleteIds.length > 0) {
            await ServicePricing.deleteMany({
                _id: {
                    $in: deleteIds,
                },
            }, {
                session,
            });
        }
    }
    /*
     * SINGLE SOURCE OF TRUTH
     * for Service.isComplete.
     *
     * A complete service requires:
     *
     * - at least one active location
     * - at least one configured tier
     * - every tier has at least one required component
     * - all required base components are active
     * - every required component has ACTIVE pricing
     *   for every configured tier + active location
     */
    static async evaluateConfigurationForService(service, session) {
        const issues = [];
        const activeLocations = service.locations.filter((location) => location.isActive);
        if (activeLocations.length === 0) {
            issues.push("No active locations configured");
        }
        if (service.tiers.length === 0) {
            issues.push("No tiers configured");
        }
        const componentQuery = ServiceComponent.find({
            serviceId: service._id,
            isRequired: true,
        })
            .select("tierId componentId isRequired");
        if (session) {
            componentQuery.session(session);
        }
        const requiredComponents = await componentQuery
            .lean();
        if (requiredComponents.length === 0) {
            issues.push("No required components configured");
        }
        /*
         * Required components must still exist
         * and be globally active.
         */
        if (requiredComponents.length > 0) {
            const requiredComponentIds = [
                ...new Set(requiredComponents.map((component) => component.componentId
                    .toString())),
            ];
            const activeComponentQuery = Component.countDocuments({
                _id: {
                    $in: requiredComponentIds,
                },
                isActive: true,
            });
            if (session) {
                activeComponentQuery.session(session);
            }
            const activeComponentCount = await activeComponentQuery;
            if (activeComponentCount !==
                requiredComponentIds.length) {
                issues.push("One or more required components are inactive or unavailable");
            }
        }
        /*
         * Every configured tier must contain
         * at least one required component.
         */
        const tierRequiredMap = new Map();
        for (const component of requiredComponents) {
            const tierId = component.tierId
                .toString();
            const existing = tierRequiredMap.get(tierId) ?? [];
            existing.push(component);
            tierRequiredMap.set(tierId, existing);
        }
        for (const tier of service.tiers) {
            const tierId = tier.tierId.toString();
            const tierComponents = tierRequiredMap.get(tierId);
            if (!tierComponents ||
                tierComponents.length === 0) {
                issues.push(`Tier ${tierId} has no required components`);
            }
        }
        /*
         * Only ACTIVE pricing can make
         * configuration complete.
         */
        const pricingQuery = ServicePricing.find({
            serviceId: service._id,
            isActive: true,
        })
            .select("tierId locationId componentId");
        if (session) {
            pricingQuery.session(session);
        }
        const pricing = await pricingQuery
            .lean();
        const priceSet = new Set(pricing.map((pricingRow) => `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.componentId.toString()}`));
        /*
         * Every configured tier must be fully
         * priced at every active location.
         */
        for (const tier of service.tiers) {
            const tierId = tier.tierId.toString();
            const tierRequiredComponents = tierRequiredMap.get(tierId) ?? [];
            if (tierRequiredComponents.length ===
                0) {
                continue;
            }
            for (const location of activeLocations) {
                const locationId = location.locationId
                    .toString();
                for (const component of tierRequiredComponents) {
                    const key = `${tierId}_${locationId}_${component.componentId.toString()}`;
                    if (!priceSet.has(key)) {
                        issues.push(`Missing active pricing for tier ${tierId}, location ${locationId}, component ${component.componentId.toString()}`);
                    }
                }
            }
        }
        return {
            isComplete: issues.length === 0,
            issues: [
                ...new Set(issues),
            ],
        };
    }
    static async computeIsComplete(service, session) {
        const evaluation = await this.evaluateConfigurationForService(service, session);
        return evaluation.isComplete;
    }
    static async computeStartingPrice(service, session) {
        const requiredComponents = await ServiceComponent.find({
            serviceId: service._id,
            isRequired: true,
        })
            .session(session)
            .select("tierId componentId")
            .lean();
        if (requiredComponents.length === 0) {
            return 0;
        }
        const activeLocationIds = new Set(service.locations
            .filter((location) => location.isActive)
            .map((location) => location.locationId
            .toString()));
        if (activeLocationIds.size ===
            0) {
            return 0;
        }
        const validTierIds = new Set(service.tiers.map((tier) => tier.tierId
            .toString()));
        if (validTierIds.size === 0) {
            return 0;
        }
        const pricing = await ServicePricing.find({
            serviceId: service._id,
            isActive: true,
        })
            .session(session)
            .select("tierId locationId componentId price")
            .lean();
        const pricingMap = new Map();
        for (const row of pricing) {
            const tierId = row.tierId.toString();
            const locationId = row.locationId.toString();
            if (!validTierIds.has(tierId) ||
                !activeLocationIds.has(locationId)) {
                continue;
            }
            pricingMap.set(`${tierId}_${locationId}_${row.componentId.toString()}`, row.price);
        }
        const tierComponentMap = new Map();
        for (const component of requiredComponents) {
            const tierId = component.tierId.toString();
            if (!validTierIds.has(tierId)) {
                continue;
            }
            const existing = tierComponentMap.get(tierId) ?? [];
            existing.push(component.componentId
                .toString());
            tierComponentMap.set(tierId, existing);
        }
        let minimumPrice = Infinity;
        for (const [tierId, componentIds,] of tierComponentMap) {
            for (const locationId of activeLocationIds) {
                let total = 0;
                let valid = true;
                for (const componentId of componentIds) {
                    const key = `${tierId}_${locationId}_${componentId}`;
                    const price = pricingMap.get(key);
                    if (price === undefined) {
                        valid =
                            false;
                        break;
                    }
                    total +=
                        price;
                }
                if (valid) {
                    minimumPrice =
                        Math.min(minimumPrice, total);
                }
            }
        }
        return minimumPrice ===
            Infinity
            ? 0
            : minimumPrice;
    }
}
//# sourceMappingURL=cascading-engine.service.js.map