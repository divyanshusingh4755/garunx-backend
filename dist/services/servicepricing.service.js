import { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
export class ServicePricingService {
    static async bulkUpsertTierPricing(payload) {
        const { serviceId, tierId, pricing } = payload;
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        if (!Array.isArray(pricing) || pricing.length === 0) {
            throw new Error("Pricing array is required");
        }
        const service = await Service.findById(serviceId);
        if (!service)
            throw new Error("Service not found");
        const tierExists = service.tiers.some((t) => t.tierId.toString() === tierId);
        if (!tierExists)
            throw new Error("Tier does not belong to service");
        const serviceLocationIds = new Set(service.locations.map((l) => l.locationId.toString()));
        const allComponentIds = new Set();
        for (const loc of pricing) {
            if (!Types.ObjectId.isValid(loc.locationId)) {
                throw new Error(`Invalid locationId: ${loc.locationId}`);
            }
            if (!serviceLocationIds.has(loc.locationId)) {
                throw new Error(`Location ${loc.locationId} not in service`);
            }
            console.log("loc", loc.components);
            if (!Array.isArray(loc.components) || loc.components.length === 0) {
                throw new Error("Each location must have components");
            }
            for (const c of loc.components) {
                allComponentIds.add(c.componentId);
            }
        }
        const componentIdsArray = Array.from(allComponentIds).map((id) => {
            if (!Types.ObjectId.isValid(id)) {
                throw new Error(`Invalid componentId: ${id}`);
            }
            return new Types.ObjectId(id);
        });
        const validComponents = await ServiceComponent.find({
            serviceId,
            tierId,
            componentId: { $in: componentIdsArray },
        }).select("componentId");
        const validSet = new Set(validComponents.map((c) => c.componentId.toString()));
        if (validSet.size !== componentIdsArray.length) {
            throw new Error("Invalid components detected for this tier");
        }
        const bulkOps = [];
        const requestKeys = new Set();
        for (const loc of pricing) {
            const locationId = loc.locationId;
            const seen = new Set();
            for (const comp of loc.components) {
                const { componentId, price } = comp;
                if (!validSet.has(componentId)) {
                    throw new Error(`Invalid component ${componentId}`);
                }
                if (seen.has(componentId)) {
                    throw new Error(`Duplicate component ${componentId}`);
                }
                seen.add(componentId);
                if (price === undefined || price < 0) {
                    throw new Error(`Invalid price for ${componentId}`);
                }
                requestKeys.add(`${locationId}_${componentId}`);
                bulkOps.push({
                    updateOne: {
                        filter: {
                            serviceId,
                            tierId,
                            locationId,
                            componentId,
                        },
                        update: {
                            $set: { price },
                        },
                        upsert: true,
                    },
                });
            }
        }
        const norConditions = Array.from(requestKeys)
            .map((key) => {
            const [locationId, componentId] = key.split("_");
            if (!locationId || !componentId)
                return null;
            return { locationId, componentId };
        })
            .filter(Boolean);
        await ServicePricing.deleteMany({
            serviceId,
            tierId,
            $nor: norConditions,
        });
        if (bulkOps.length > 0) {
            await ServicePricing.bulkWrite(bulkOps);
        }
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Pricing updated successfully",
        };
    }
    static async resolvePricing(serviceId, tierId, locationId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        if (!Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid locationId");
        }
        const service = await Service.findById(serviceId).lean();
        if (!service) {
            throw new Error("Service not found");
        }
        if (!service.isActive) {
            throw new Error("Service is inactive");
        }
        const tier = service.tiers.find((t) => t.tierId.toString() === tierId);
        if (!tier) {
            throw new Error("Tier does not belong to service");
        }
        const location = service.locations.find((l) => l.locationId.toString() === locationId);
        if (!location) {
            throw new Error("Location does not belong to service");
        }
        if (!location.isActive) {
            throw new Error("Location is inactive for this service");
        }
        const components = await ServiceComponent.find({
            serviceId,
            tierId,
        })
            .populate({
            path: "componentId",
            select: `
          name
          description
          imageUrl
          isActive
        `,
        })
            .select(`
        componentId
        isRequired
        items
        displayOrder
      `)
            .sort({ displayOrder: 1 })
            .lean();
        const pricing = await ServicePricing.find({
            serviceId,
            tierId,
            locationId,
        })
            .select("componentId price")
            .lean();
        const pricingMap = new Map(pricing.map((p) => [p.componentId.toString(), p.price]));
        const resolvedComponents = components.map((component) => {
            const componentData = component.componentId;
            const componentId = componentData._id.toString();
            const hasPrice = pricingMap.has(componentId);
            const price = pricingMap.get(componentId) ?? null;
            return {
                componentId: componentData._id,
                name: componentData.name,
                description: componentData.description || "",
                imageUrl: componentData.imageUrl || null,
                isRequired: component.isRequired,
                price,
                isPriceConfigured: hasPrice,
                items: component.items || [],
            };
        });
        const requiredComponents = resolvedComponents.filter((c) => c.isRequired);
        const optionalComponents = resolvedComponents.filter((c) => !c.isRequired);
        const startingPrice = requiredComponents.reduce((sum, c) => sum + (c.price ?? 0), 0);
        const isAvailable = requiredComponents.length > 0 &&
            requiredComponents.every((c) => c.isPriceConfigured);
        return {
            service: {
                id: service._id,
                name: service.name,
                shortDescription: service.shortDescription,
                fullDescription: service.fullDescription,
                thumbnailImage: service.thumbnailImage,
                bannerImage: service.bannerImage,
                serviceReference: service.serviceReference,
            },
            tier: {
                id: tier.tierId,
                name: tier.name,
            },
            location: {
                id: location.locationId,
                name: location.name,
            },
            components: resolvedComponents,
            summary: {
                totalComponents: resolvedComponents.length,
                requiredComponentCount: requiredComponents.length,
                optionalComponentCount: optionalComponents.length,
                startingPrice,
                isAvailable,
            },
        };
    }
}
//# sourceMappingURL=servicepricing.service.js.map