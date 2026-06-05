import mongoose from "mongoose";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
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

  static async getDeactivationImpact(tierId: string) {
    const [serviceComponents, servicePricing, packageMappings, packagePricing] =
      await Promise.all([
        ServiceComponent.find(
          { tierId },
          {
            _id: 1,
            serviceId: 1,
            componentId: 1,
          },
        ).lean(),

        ServicePricing.find(
          { tierId },
          {
            _id: 1,
            serviceId: 1,
            componentId: 1,
          },
        ).lean(),

        PackageTierMap.find(
          { tierId },
          {
            _id: 1,
            packageId: 1,
          },
        ).lean(),

        PackageTierPricing.find(
          { tierId },
          {
            _id: 1,
            packageId: 1,
            serviceId: 1,
          },
        ).lean(),
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

  static async toggleTierStatus(
    id: string,
    isActive: boolean,
    confirmed = false,
  ) {
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

    /**
     * CONFIRMATION FLOW
     */
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
        await Tier.findByIdAndUpdate(id, { isActive: false }, { session });

        await ServiceComponent.deleteMany({ tierId: id }, { session });

        await ServicePricing.deleteMany({ tierId: id }, { session });

        await PackageTierMap.deleteMany({ tierId: id }, { session });

        await PackageTierPricing.deleteMany({ tierId: id }, { session });
      });

      return {
        success: true,
        message: `Tier ${isActive ? "activated" : "deactivated"} successfully`,
      };
    } catch (err: any) {
      throw err;
    } finally {
      await session.endSession();
    }
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
