import mongoose from "mongoose";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Tier } from "../models/tier.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class TierService {
    static async createTier(tierData) {
        const existingTier = await Tier.findOne({
            name: tierData.name,
        });
        if (existingTier) {
            throw new Error(`Tier with name '${tierData.name}' already exists`);
        }
        const tier = new Tier(tierData);
        return await tier.save();
    }
    static async updateTier(id, tierData) {
        if (tierData.name) {
            const existing = await Tier.findOne({
                name: tierData.name,
                _id: { $ne: id },
            });
            if (existing) {
                throw new Error(`Tier with value '${tierData.name}' already exists`);
            }
        }
        const tier = await Tier.findByIdAndUpdate(id, { $set: tierData }, { new: true, runValidators: true });
        if (!tier) {
            throw new Error("Tier not found");
        }
        return tier;
    }
    static async getTierById(id) {
        const tier = await Tier.findById(id);
        if (!tier) {
            throw new Error("Tier not found");
        }
        return tier;
    }
    static async getDeactivationImpact(tierId) {
        const [serviceComponents, servicePricing, packageMappings, packagePricing] = await Promise.all([
            ServiceComponent.find({ tierId }, {
                _id: 1,
                serviceId: 1,
                componentId: 1,
            }).lean(),
            ServicePricing.find({ tierId }, {
                _id: 1,
                serviceId: 1,
                componentId: 1,
            }).lean(),
            PackageTierMap.find({ tierId }, {
                _id: 1,
                packageId: 1,
            }).lean(),
            PackageTierPricing.find({ tierId }, {
                _id: 1,
                packageId: 1,
                serviceId: 1,
            }).lean(),
        ]);
        return {
            serviceComponentCount: serviceComponents.length,
            servicePricingCount: servicePricing.length,
            packageMappingCount: packageMappings.length,
            packagePricingCount: packagePricing.length,
            serviceComponents,
            servicePricing,
            packageMappings,
            packagePricing,
        };
    }
    static async toggleTierStatus(id, isActive, confirmed = false) {
        const tier = await Tier.findById(id);
        if (!tier) {
            throw new Error("Tier not found");
        }
        if (tier.isActive === isActive) {
            return {
                success: true,
                message: `Tier already ${isActive ? "active" : "inactive"}`,
            };
        }
        // Confirmation only when deactivating
        if (!isActive && !confirmed) {
            const impact = await TierService.getDeactivationImpact(id);
            return {
                requiresConfirmation: true,
                message: "Tier is used in services and packages. Are you sure?",
                impact,
            };
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // Always update tier status
                await Tier.findByIdAndUpdate(id, { isActive }, { session });
                // Only remove mappings when deactivating
                if (!isActive) {
                    await ServiceComponent.deleteMany({ tierId: id }, { session });
                    await ServicePricing.deleteMany({ tierId: id }, { session });
                    await PackageTierMap.deleteMany({ tierId: id }, { session });
                    await PackageTierPricing.deleteMany({ tierId: id }, { session });
                }
            });
            return {
                success: true,
                message: `Tier ${isActive ? "activated" : "deactivated"} successfully`,
            };
        }
        catch (err) {
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    static async FindTiers(limit = 40, page = 1, sortBy, sortOrder = "asc", searchTerm, isActive) {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive == "boolean") {
            query.isActive = isActive;
        }
        const isTextSearch = !!searchTerm?.trim() && searchTerm.trim().length > 4;
        if (searchTerm?.trim()) {
            const term = searchTerm.trim();
            if (isTextSearch) {
                query.$text = {
                    $search: term,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(term)}`,
                    $options: "i",
                };
            }
        }
        let sortCriteria = {};
        let projection = {};
        if (isTextSearch && sortBy === "relevance") {
            projection = {
                score: {
                    $meta: "textScore",
                },
            };
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                Tier.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Tier.countDocuments(query),
            ]);
            return { data, total, page, totalPages: Math.ceil(total / limit) };
        }
        catch (error) {
            throw new Error(`Tier Fetch Failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=tier.service.js.map