import mongoose, { Types, } from "mongoose";
import { Service, } from "../models/service.model.js";
import { ServiceComponent, } from "../models/servicecomponent.model.js";
import { ServicePricing, } from "../models/servicepricing.model.js";
import { ServiceService, } from "./service.service.js";
export class ServiceCascadingEngine {
    static async run(serviceId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const service = await Service.findById(serviceId).session(session);
                if (!service) {
                    throw new Error("Service not found");
                }
                await this.cleanupTierOrphans(service, session);
                await this.cleanupLocationOrphans(service, session);
                await this.cleanupComponentOrphans(service, session);
                await this.cleanupPricing(service, session);
                const refreshed = await Service.findById(serviceId).session(session);
                if (!refreshed) {
                    throw new Error("Service lost during cleanup");
                }
                const isComplete = await this.computeIsComplete(refreshed, session);
                refreshed.isComplete =
                    isComplete;
                refreshed.isActive =
                    isComplete;
                await refreshed.save({
                    session,
                });
            });
            await ServiceService
                .updateServiceStartingPrice(serviceId);
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
            .select("tierId locationId componentId")
            .lean();
        const deleteIds = [];
        for (const pricingRow of pricing) {
            const tierId = pricingRow.tierId
                .toString();
            const locationId = pricingRow.locationId
                .toString();
            const componentId = pricingRow.componentId
                .toString();
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
    static async computeIsComplete(service, session) {
        const components = await ServiceComponent.find({
            serviceId: service._id,
        })
            .session(session)
            .select("tierId componentId isRequired")
            .lean();
        const pricing = await ServicePricing.find({
            serviceId: service._id,
        })
            .session(session)
            .select("tierId locationId componentId")
            .lean();
        const activeLocations = service.locations.filter((location) => location.isActive);
        if (activeLocations.length === 0 ||
            service.tiers.length === 0) {
            return false;
        }
        const requiredComponents = components.filter((component) => component.isRequired);
        if (requiredComponents.length === 0) {
            return false;
        }
        const priceSet = new Set(pricing.map((pricingRow) => `${pricingRow.tierId.toString()}_${pricingRow.locationId.toString()}_${pricingRow.componentId.toString()}`));
        for (const tier of service.tiers) {
            const tierId = tier.tierId.toString();
            const tierRequiredComponents = requiredComponents.filter((component) => component.tierId
                .toString() ===
                tierId);
            /*
             * Every configured tier must have at least one
             * required component. Skipping an empty tier would
             * incorrectly mark the service complete.
             */
            if (tierRequiredComponents.length ===
                0) {
                return false;
            }
            for (const location of activeLocations) {
                const locationId = location.locationId
                    .toString();
                for (const component of tierRequiredComponents) {
                    const key = `${tierId}_${locationId}_${component.componentId.toString()}`;
                    if (!priceSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
//# sourceMappingURL=cascading-engine.service.js.map