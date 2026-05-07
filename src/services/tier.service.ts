import { Tier, type ITier } from "../models/tier.model.js";

export class TierService {
  static async createTier(tierData: ITier) {
    const existingTier = await Tier.findOne({
      name: tierData.name,
    });

    if (existingTier) {
      throw new Error(`Tier with name '${tierData.name}' already exists`);
    }

    const tier = new Tier(tierData);
    return await tier.save();
  }

  static async updateTier(id: string, tierData: Partial<ITier>) {
    if (tierData.name) {
      const existing = await Tier.findOne({
        name: tierData.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error(`Tier with value '${tierData.name}' already exists`);
      }
    }

    const tier = await Tier.findByIdAndUpdate(
      id,
      { $set: tierData },
      { new: true, runValidators: true },
    );

    if (!tier) {
      throw new Error("Tier not found");
    }

    return tier;
  }

  static async getTierById(id: string) {
    const tier = await Tier.findById(id);
    if (!tier) {
      throw new Error("Tier not found");
    }

    return tier;
  }

  static async toggleTierStatus(id: string, isActive: boolean) {
    const tier = await Tier.findById(id);
    if (!tier) {
      throw new Error("Tier not found");
    }

    tier.isActive = isActive;
    return await tier.save();
  }

  static async FindTiers(
    limit: number = 40,
    page: number = 1,
    sortBy: string,
    sortOrder: "asc" | "desc" = "asc",
    searchTerm?: string,
    isActive?: boolean,
  ) {
    const skip = limit * (page - 1);
    const query: any = {};

    if (typeof isActive == "boolean") {
      query.isActive = isActive;
    }

    if (searchTerm) query.$text = { $search: searchTerm };

    let sortCriteria: any = {};
    let projection: any = {};

    if (searchTerm && sortBy === "relevance") {
      projection = { score: { $meta: "textScore" } };
      sortCriteria: {
        score: {
          $meta: "textScore";
        }
      }
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
      if (sortBy == "createdAt") sortCriteria["createdAt"] = -1;
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
    } catch (error: any) {
      throw new Error(`Tier Fetch Failed: ${error.message}`);
    }
  }
}
