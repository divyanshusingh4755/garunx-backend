import { Types } from "mongoose";
import mongoose from "mongoose";
import { Service } from "../models/service.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ServiceService } from "./service.service.js";
export class ServiceCascadingEngine {
    static async run(serviceId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const service = await Service.findById(serviceId).session(session);
                if (!service)
                    throw new Error("Service not found");
                // IMPORTANT: always re-fetch fresh state after mutations
                await this.cleanupTierOrphans(service, session);
                await this.cleanupLocationOrphans(service, session);
                await this.cleanupComponentOrphans(service, session);
                await this.cleanupPricing(service, session);
                // reload updated service snapshot
                const refreshed = await Service.findById(serviceId).session(session);
                if (!refreshed)
                    throw new Error("Service lost during cleanup");
                const isComplete = await this.computeIsComplete(refreshed, session);
                refreshed.isComplete = isComplete;
                refreshed.isActive = isComplete;
                await refreshed.save({ session });
            });
            await ServiceService.updateServiceStartingPrice(serviceId);
        }
        finally {
            session.endSession();
        }
    }
    static async cleanupTierOrphans(service, session) {
        const validTierIds = service.tiers.map((t) => t.tierId.toString());
        if (!validTierIds.length) {
            await ServiceComponent.deleteMany({ serviceId: service._id }, { session });
            return;
        }
        await ServiceComponent.deleteMany({
            serviceId: service._id,
            tierId: { $nin: validTierIds },
        }, { session });
    }
    static async cleanupLocationOrphans(service, session) {
        const validLocationIds = service.locations.map((l) => l.locationId.toString());
        if (!validLocationIds.length) {
            await ServicePricing.deleteMany({ serviceId: service._id }, { session });
            return;
        }
        await ServicePricing.deleteMany({
            serviceId: service._id,
            locationId: { $nin: validLocationIds },
        }, { session });
    }
    static async cleanupComponentOrphans(service, session) {
        const validTierIds = service.tiers.map((t) => t.tierId.toString());
        if (!validTierIds.length) {
            await ServiceComponent.deleteMany({ serviceId: service._id }, { session });
            return;
        }
        await ServiceComponent.deleteMany({
            serviceId: service._id,
            tierId: { $nin: validTierIds },
        }, { session });
        // remove broken docs safely
        await ServiceComponent.deleteMany({
            serviceId: service._id,
            $or: [
                { tierId: { $exists: false } },
                { componentId: { $exists: false } },
            ],
        }, { session });
    }
    static async cleanupPricing(service, session) {
        const validTierIds = new Set(service.tiers.map((t) => t.tierId.toString()));
        const validLocationIds = new Set(service.locations.map((l) => l.locationId.toString()));
        const components = await ServiceComponent.find({
            serviceId: service._id,
        })
            .session(session)
            .select("tierId componentId");
        const validComponentKeys = new Set(components.map((c) => `${c.tierId.toString()}_${c.componentId.toString()}`));
        const pricing = await ServicePricing.find({
            serviceId: service._id,
        }).session(session);
        const deleteIds = [];
        for (const p of pricing) {
            const tierId = p.tierId.toString();
            const locationId = p.locationId.toString();
            const componentId = p.componentId.toString();
            const key = `${tierId}_${componentId}`;
            const invalid = !validTierIds.has(tierId) ||
                !validLocationIds.has(locationId) ||
                !validComponentKeys.has(key);
            if (invalid)
                deleteIds.push(p._id);
        }
        if (deleteIds.length) {
            await ServicePricing.deleteMany({ _id: { $in: deleteIds } }, { session });
        }
    }
    static async computeIsComplete(service, session) {
        const components = await ServiceComponent.find({
            serviceId: service._id,
        })
            .session(session)
            .lean();
        const pricing = await ServicePricing.find({
            serviceId: service._id,
        })
            .session(session)
            .lean();
        // 1. Filter for active locations only
        const activeLocations = service.locations.filter((l) => l.isActive);
        // 2. Initial Guards
        if (!activeLocations.length)
            return false;
        if (!service.tiers.length)
            return false;
        const requiredComponents = components.filter((c) => c.isRequired);
        if (!requiredComponents.length)
            return false;
        // 3. Build the price set with explicit strings
        const priceSet = new Set(pricing.map((p) => `${p.tierId.toString()}_${p.locationId.toString()}_${p.componentId.toString()}`));
        // 4. Check for completion
        for (const tier of service.tiers) {
            const tierRequiredComponents = requiredComponents.filter((c) => c.tierId.toString() === tier.tierId.toString());
            // Skip tiers that have no required components defined (optional)
            if (tierRequiredComponents.length === 0)
                continue;
            // Use activeLocations here, NOT service.locations
            for (const loc of activeLocations) {
                for (const comp of tierRequiredComponents) {
                    const key = `${tier.tierId.toString()}_${loc.locationId.toString()}_${comp.componentId.toString()}`;
                    if (!priceSet.has(key)) {
                        console.log(`Missing pricing for: ${key}`);
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
//# sourceMappingURL=cascading-engine.service.js.map