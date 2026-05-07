import { Tier } from "../models/tier.model.js";
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
    static async toggleTierStatus(id, isActive) {
        const tier = await Tier.findById(id);
        if (!tier) {
            throw new Error("Tier not found");
        }
        tier.isActive = isActive;
        return await tier.save();
    }
    static async FindTiers(limit = 40, page = 1, sortBy, sortOrder = "asc", searchTerm, isActive) {
        const skip = limit * (page - 1);
        const query = {};
        if (typeof isActive == "boolean") {
            query.isActive = isActive;
        }
        if (searchTerm)
            query.$text = { $search: searchTerm };
        let sortCriteria = {};
        let projection = {};
        if (searchTerm && sortBy === "relevance") {
            projection = { score: { $meta: "textScore" } };
            sortCriteria: {
                score: {
                    $meta: "textScore";
                }
            }
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy == "createdAt")
                sortCriteria["createdAt"] = -1;
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