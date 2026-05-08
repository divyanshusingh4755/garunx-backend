import { Types } from "mongoose";
import { Service } from "../models/service.model.js";
import { Category } from "../models/category.model.js";
import { generateSlug } from "../utils/generateSlug.js";
import { getNextSequence } from "../utils/getNextSequence.js";
import { Tier } from "../models/tier.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Location } from "../models/location.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
export class ServiceService {
    static async createService(payload) {
        let { name, shortDescription, fullDescription, categoryId, thumbnailImage, bannerImage, } = payload;
        name = name?.trim();
        shortDescription = shortDescription?.trim();
        fullDescription = fullDescription?.trim();
        if (!name || !shortDescription || !categoryId) {
            throw new Error("Missing required fields");
        }
        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error("Invalid categoryId format");
        }
        const categoryExists = await Category.exists({ _id: categoryId });
        if (!categoryExists) {
            throw new Error("Invalid categoryId");
        }
        const slug = generateSlug(name);
        const seq = await getNextSequence(`service_${slug}`);
        const serviceReference = `${slug}_${String(seq).padStart(4, "0")}`;
        const service = await Service.create({
            name,
            shortDescription,
            fullDescription,
            categoryId,
            thumbnailImage,
            bannerImage,
            locations: [],
            tiers: [],
            serviceReference,
            isActive: false,
            isComplete: false,
        });
        return service;
    }
    static async updateService(serviceId, payload) {
        const { name, shortDescription, fullDescription, categoryId, thumbnailImage, bannerImage, } = payload;
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        const updateData = {};
        if (name !== undefined) {
            if (!name.trim()) {
                throw new Error("Service name cannot be empty");
            }
            updateData.name = name.trim();
        }
        if (shortDescription !== undefined) {
            if (!shortDescription.trim()) {
                throw new Error("Short description cannot be empty");
            }
            updateData.shortDescription = shortDescription.trim();
        }
        if (fullDescription !== undefined) {
            if (fullDescription && typeof fullDescription === "string") {
                updateData.fullDescription = fullDescription.trim();
            }
            else {
                throw new Error("Invalid fullDescription");
            }
        }
        if (thumbnailImage !== undefined) {
            updateData.thumbnailImage = thumbnailImage;
        }
        if (bannerImage !== undefined) {
            updateData.bannerImage = bannerImage;
        }
        if (categoryId !== undefined) {
            if (!Types.ObjectId.isValid(categoryId)) {
                throw new Error("Invalid categoryId format");
            }
            const categoryExists = await Category.exists({ _id: categoryId });
            if (!categoryExists) {
                throw new Error("Invalid CategoryId");
            }
            updateData.categoryId = categoryId;
        }
        if (Object.keys(updateData).length === 0) {
            throw new Error("No valid fields provided for update");
        }
        const updatedService = await Service.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true, runValidators: true });
        if (!updatedService)
            throw new Error("Service not found");
        return updatedService;
    }
    static async getServiceById(serviceId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId).lean();
        if (!service)
            throw new Error("Service not found");
        return service;
    }
    static async toggleServiceStatus(serviceId, isActive) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        if (service.isActive === isActive) {
            return {
                success: true,
                message: `Service already ${isActive ? "active" : "inactive"}`,
            };
        }
        if (isActive) {
            const validation = await ServiceService.validateServiceConfiguration(serviceId);
            if (!validation.isComplete) {
                throw new Error("Service configuration incomplete. Cannot activate.");
            }
        }
        service.isActive = isActive;
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
        };
    }
    static async FindServices(searchTerm, categoryId, limit = 20, page = 1, isActive, isComplete, sortBy = "createdAt", sortOrder = "desc") {
        const skip = (page - 1) * limit;
        const matchQuery = {};
        if (isActive !== undefined)
            matchQuery.isActive = isActive;
        if (isComplete !== undefined)
            matchQuery.isComplete = isComplete;
        if (categoryId) {
            if (!Types.ObjectId.isValid(categoryId)) {
                throw new Error("Invalid categoryId");
            }
            matchQuery.categoryId = categoryId;
        }
        if (searchTerm)
            matchQuery.$text = { $search: searchTerm };
        let sortCriteria = {};
        if (searchTerm && sortBy === "relevance") {
            sortCriteria = { score: { $meta: "textScore" } };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        }
        try {
            const [data, total] = await Promise.all([
                Service.find(matchQuery)
                    .select({
                    name: 1,
                    shortDescription: 1,
                    thumbnailImage: 1,
                    categoryId: 1,
                    isActive: 1,
                    serviceReference: 1,
                    createdAt: 1,
                    isComplete: 1,
                    locations: 1,
                    tiers: 1,
                    ...(searchTerm && { score: { $meta: "textScore" } }),
                })
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Service.countDocuments(matchQuery),
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`Service fetch failed: ${error.message}`);
        }
    }
    static async updateServiceLocations(serviceId, locations) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        if (!Array.isArray(locations) || locations.length === 0) {
            throw new Error("At least one location is required");
        }
        const uniqueIds = [...new Set(locations.map((l) => l.locationId))];
        const objectIds = [];
        for (const id of uniqueIds) {
            if (!Types.ObjectId.isValid(id)) {
                throw new Error(`Invalid locationId: ${id}`);
            }
            objectIds.push(new Types.ObjectId(id));
        }
        const validLocations = await Location.find({
            _id: { $in: objectIds },
        }).select("_id name");
        if (validLocations.length !== objectIds.length) {
            throw new Error("One or more locationIds are Invalid");
        }
        const formattedLocations = validLocations.map((loc) => ({
            locationId: loc._id,
            name: loc.name,
            isActive: true,
        }));
        service.locations = formattedLocations;
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Service locationIds updated successfully",
            locations: formattedLocations,
        };
    }
    static async removeServiceLocation(serviceId, locationId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (!Types.ObjectId.isValid(locationId)) {
            throw new Error("Invalid locationId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        const exists = service.locations.some((loc) => loc.locationId.toString() === locationId);
        if (!exists) {
            return {
                success: true,
                message: "Location already not present",
                locations: service.locations,
            };
        }
        if (service.locations.length === 1) {
            throw new Error("Service must have at least one location");
        }
        service.locations = service.locations.filter((loc) => loc.locationId.toString() !== locationId);
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Location removed successfully",
            locations: service.locations,
        };
    }
    static async updateServiceTiers(serviceId, tiers) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        if (!Array.isArray(tiers) || tiers.length === 0) {
            throw new Error("At least one tier is required");
        }
        const uniqueIds = [...new Set(tiers.map((t) => t.tierId))];
        const objectIds = [];
        for (const id of uniqueIds) {
            if (!Types.ObjectId.isValid(id)) {
                throw new Error(`Invalid tierId: ${id}`);
            }
            objectIds.push(new Types.ObjectId(id));
        }
        const validTiers = await Tier.find({
            _id: { $in: objectIds },
        }).select("_id name");
        if (validTiers.length !== objectIds.length) {
            throw new Error("One or more tierIds are invalid");
        }
        const currentIds = service.tiers.map((t) => t.tierId.toString());
        const newIds = objectIds.map((id) => id.toString());
        const isSame = currentIds.length === newIds.length &&
            currentIds.every((id) => newIds.includes(id));
        if (isSame) {
            return {
                success: true,
                message: "No changes in tiers",
            };
        }
        service.tiers = validTiers.map((t) => ({
            tierId: t._id,
            name: t.name,
        }));
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Service tiers updated successfully",
            tiers: service.tiers,
        };
    }
    static async removeServiceTier(serviceId, tierId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        if (!Types.ObjectId.isValid(tierId)) {
            throw new Error("Invalid tierId");
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error("Service not found");
        }
        const exists = service.tiers.some((t) => t.tierId.toString() === tierId);
        if (!exists) {
            return {
                success: true,
                message: "Tier already not present",
            };
        }
        if (service.tiers.length === 1) {
            throw new Error("Service must have at least one tier");
        }
        service.tiers = service.tiers.filter((t) => t.tierId.toString() !== tierId);
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Tier removed successfully",
            tiers: service.tiers,
        };
    }
    static async getFullService(serviceId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId).lean();
        if (!service) {
            throw new Error("Service not found");
        }
        const [components, pricing] = await Promise.all([
            ServiceComponent.find({ serviceId }).lean(),
            ServicePricing.find({ serviceId }).lean(),
        ]);
        const pricingMap = new Map();
        for (const p of pricing) {
            const key = `${p.tierId}_${p.componentId}`;
            if (!pricingMap.has(key)) {
                pricingMap.set(key, []);
            }
            pricingMap.get(key).push({
                locationId: p.locationId,
                price: p.price,
            });
        }
        const grouped = {};
        for (const comp of components) {
            const tierId = comp.tierId.toString();
            if (!grouped[tierId]) {
                grouped[tierId] = {
                    tierId: comp.tierId,
                    components: [],
                };
            }
            const pricingKey = `${comp.tierId}_${comp.componentId}`;
            grouped[tierId].components.push({
                componentId: comp.componentId,
                name: comp.name,
                isRequired: comp.isRequired,
                items: comp.items || [],
                pricing: pricingMap.get(pricingKey) || [],
            });
        }
        return {
            service: {
                id: service._id,
                name: service.name,
                shortDescription: service.shortDescription,
                fullDescription: service.fullDescription,
                thumbnailImage: service.thumbnailImage,
                bannerImage: service.bannerImage,
                isActive: service.isActive,
                isComplete: service.isComplete,
                serviceReference: service.serviceReference,
            },
            locations: service.locations,
            tiers: service.tiers.map((t) => ({
                tierId: t.tierId,
                name: t.name,
            })),
            components: grouped,
        };
    }
    static async updateServiceStartingPrice(serviceId) {
        // fetch all required component mappings
        const components = await ServiceComponent.find({
            serviceId,
            isRequired: true,
        }).lean();
        if (!components.length) {
            await Service.findByIdAndUpdate(serviceId, {
                startingPrice: 0,
            });
            return;
        }
        // group required components by tier
        const tierComponentMap = new Map();
        for (const component of components) {
            const tierId = component.tierId.toString();
            if (!tierComponentMap.has(tierId)) {
                tierComponentMap.set(tierId, []);
            }
            tierComponentMap.get(tierId).push(component.componentId.toString());
        }
        // fetch all pricing
        const pricing = await ServicePricing.find({
            serviceId,
        }).lean();
        // build pricing lookup
        const pricingMap = new Map();
        for (const p of pricing) {
            const key = `${p.tierId}_${p.locationId}_${p.componentId}`;
            pricingMap.set(key, p.price);
        }
        let minimumPrice = Infinity;
        // calculate each tier/location combination
        for (const [tierId, componentIds] of tierComponentMap.entries()) {
            const locationIds = [
                ...new Set(pricing
                    .filter((p) => p.tierId.toString() === tierId)
                    .map((p) => p.locationId.toString())),
            ];
            for (const locationId of locationIds) {
                let total = 0;
                let valid = true;
                for (const componentId of componentIds) {
                    const key = `${tierId}_${locationId}_${componentId}`;
                    const price = pricingMap.get(key);
                    if (price == null) {
                        valid = false;
                        break;
                    }
                    total += price;
                }
                if (valid) {
                    minimumPrice = Math.min(minimumPrice, total);
                }
            }
        }
        await Service.findByIdAndUpdate(serviceId, {
            startingPrice: minimumPrice === Infinity ? 0 : minimumPrice,
        });
    }
    static async getRuntimeServices({ categoryId, locationId, searchTerm, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", }) {
        const skip = (page - 1) * limit;
        const matchQuery = {
            isActive: true,
        };
        if (categoryId) {
            if (!Types.ObjectId.isValid(categoryId)) {
                throw new Error("Invalid categoryId");
            }
            matchQuery.categoryId = new Types.ObjectId(categoryId);
        }
        if (locationId) {
            if (!Types.ObjectId.isValid(locationId)) {
                throw new Error("Invalid locationId");
            }
            matchQuery.locations = {
                $elemMatch: {
                    locationId: new Types.ObjectId(locationId),
                    isActive: true,
                },
            };
        }
        if (searchTerm?.trim()) {
            matchQuery.$text = {
                $search: searchTerm.trim(),
            };
        }
        let sortCriteria = {};
        if (searchTerm && sortBy === "relevance") {
            sortCriteria = {
                score: { $meta: "textScore" },
            };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "asc" ? 1 : -1;
        }
        const baseQuery = Service.find(matchQuery)
            .select({
            name: 1,
            shortDescription: 1,
            thumbnailImage: 1,
            bannerImage: 1,
            startingPrice: 1,
            locations: 1,
            tiers: 1,
            serviceReference: 1,
            ...(searchTerm ? { score: { $meta: "textScore" } } : {}),
        })
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .lean();
        const [services, total] = await Promise.all([
            baseQuery,
            Service.countDocuments(matchQuery),
        ]);
        const formattedServices = services.map((service) => ({
            id: service._id,
            name: service.name,
            shortDescription: service.shortDescription,
            thumbnailImage: service.thumbnailImage,
            bannerImage: service.bannerImage,
            startingPrice: service.startingPrice || 0,
            serviceReference: service.serviceReference,
            locations: (service.locations || []).filter((l) => l.isActive),
            tiers: service.tiers || [],
        }));
        return {
            services: formattedServices,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async validateServiceConfiguration(serviceId) {
        if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error("Invalid serviceId");
        }
        const service = await Service.findById(serviceId).lean();
        if (!service) {
            throw new Error("Service not found");
        }
        const issues = [];
        if (!service.isActive) {
            issues.push("Service is inactive");
        }
        const activeLocations = service.locations.filter((l) => l.isActive);
        if (activeLocations.length === 0) {
            issues.push("No active locations configured");
        }
        if (!service.tiers.length) {
            issues.push("No tiers configured");
        }
        const requiredComponents = await ServiceComponent.find({
            serviceId,
            isRequired: true,
        }).lean();
        if (requiredComponents.length === 0) {
            issues.push("No required components configured");
        }
        const pricing = await ServicePricing.find({
            serviceId,
        }).lean();
        const pricingMap = new Set(pricing.map((p) => `${p.tierId}_${p.locationId}_${p.componentId}`));
        const tierComponentMap = new Map();
        for (const c of requiredComponents) {
            const tierId = c.tierId.toString();
            if (!tierComponentMap.has(tierId)) {
                tierComponentMap.set(tierId, []);
            }
            tierComponentMap.get(tierId).push(c);
        }
        let hasValidCombination = false;
        // now iterate efficiently
        for (const [tierId, tierComponents] of tierComponentMap.entries()) {
            for (const location of activeLocations) {
                const allPriced = tierComponents.every((c) => {
                    const key = `${tierId}_${location.locationId.toString()}_${c.componentId.toString()}`;
                    return pricingMap.has(key);
                });
                if (allPriced) {
                    hasValidCombination = true;
                    break;
                }
            }
            if (hasValidCombination)
                break;
        }
        if (!hasValidCombination) {
            issues.push("No fully priced tier/location combination exists");
        }
        const isComplete = issues.length === 0;
        await Service.findByIdAndUpdate(serviceId, {
            isComplete,
        });
        return {
            isComplete,
            issues,
        };
    }
}
//# sourceMappingURL=service.service.js.map