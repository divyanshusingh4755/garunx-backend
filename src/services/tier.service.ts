import mongoose, { Types } from "mongoose";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Tier, type ITier } from "../models/tier.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class TierService {
  static async createTier(tierData: ITier) {
    const existingTier = await Tier.findOne({
      $or: [
        { name: tierData.name },
        ...(tierData.tierReference
          ? [{ tierReference: tierData.tierReference }]
          : []),
      ],
    });

    if (existingTier) {
      if (existingTier.name === tierData.name) {
        throw new Error(
          `Tier with name '${tierData.name}' already exists`,
        );
      }

      throw new Error(
        `Tier with reference '${tierData.tierReference}' already exists`,
      );
    }

    const tier = new Tier(tierData);

    return tier.save();
  }

  static async updateTier(
    id: string,
    tierData: Partial<ITier>,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid tier id");
    }

    const duplicateConditions: Record<string, any>[] = [];

    if (tierData.name) {
      duplicateConditions.push({ name: tierData.name });
    }

    if (tierData.tierReference) {
      duplicateConditions.push({
        tierReference: tierData.tierReference,
      });
    }

    if (duplicateConditions.length > 0) {
      const existing = await Tier.findOne({
        _id: { $ne: id },
        $or: duplicateConditions,
      });

      if (existing) {
        if (
          tierData.name &&
          existing.name === tierData.name
        ) {
          throw new Error(
            `Tier with name '${tierData.name}' already exists`,
          );
        }

        throw new Error(
          `Tier with reference '${tierData.tierReference}' already exists`,
        );
      }
    }

    const tier = await Tier.findByIdAndUpdate(
      id,
      { $set: tierData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!tier) {
      throw new Error("Tier not found");
    }

    return tier;
  }

  static async getTierById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid tier id");
    }

    const tier = await Tier.findById(id).lean();

    if (!tier) {
      throw new Error("Tier not found");
    }

    return tier;
  }

  static async getDeactivationImpact(tierId: string) {
    const [
      serviceComponents,
      servicePricing,
      packageMappings,
      packagePricing,
    ] = await Promise.all([
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
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid tier id");
    }

    if (typeof isActive !== "boolean") {
      throw new Error("isActive must be boolean");
    }

    const tier = await Tier.findById(id);

    if (!tier) {
      throw new Error("Tier not found");
    }

    if (tier.isActive === isActive) {
      return {
        success: true,
        requiresConfirmation: false as const,
        isActive: tier.isActive,
        message: `Tier already ${
          isActive ? "active" : "inactive"
        }`,
      };
    }

    if (!isActive && !confirmed) {
      const impact = await this.getDeactivationImpact(id);

      const hasImpact =
        impact.serviceComponentCount > 0 ||
        impact.servicePricingCount > 0 ||
        impact.packageMappingCount > 0 ||
        impact.packagePricingCount > 0;

      if (hasImpact) {
        return {
          success: true,
          requiresConfirmation: true as const,
          message:
            "Tier is used in services and packages. Are you sure?",
          impact,
        };
      }
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const updatedTier = await Tier.findByIdAndUpdate(
          id,
          { isActive },
          {
            session,
            new: true,
            runValidators: true,
          },
        );

        if (!updatedTier) {
          throw new Error("Tier not found");
        }

        if (!isActive) {
          await Promise.all([
            ServiceComponent.deleteMany(
              { tierId: id },
              { session },
            ),

            ServicePricing.deleteMany(
              { tierId: id },
              { session },
            ),

            PackageTierMap.deleteMany(
              { tierId: id },
              { session },
            ),

            PackageTierPricing.deleteMany(
              { tierId: id },
              { session },
            ),
          ]);
        }
      });

      return {
        success: true,
        requiresConfirmation: false as const,
        isActive,
        message: `Tier ${
          isActive ? "activated" : "deactivated"
        } successfully`,
      };
    } finally {
      await session.endSession();
    }
  }

  static async findTiers(
    limit: number = 40,
    page: number = 1,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "asc",
    searchTerm?: string,
    isActive?: boolean,
  ) {
    const safeLimit =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 40;

    const safePage =
      Number.isInteger(page) && page > 0 ? page : 1;

    const skip = safeLimit * (safePage - 1);
    const query: Record<string, any> = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    const trimmedSearchTerm = searchTerm?.trim();
    const isTextSearch =
      Boolean(trimmedSearchTerm) &&
      trimmedSearchTerm!.length > 4;

    if (trimmedSearchTerm) {
      if (isTextSearch) {
        query.$text = {
          $search: trimmedSearchTerm,
        };
      } else {
        query.name = {
          $regex: `^${escapeRegex(trimmedSearchTerm)}`,
          $options: "i",
        };
      }
    }

    const allowedSortFields = new Set([
      "name",
      "tierReference",
      "isActive",
      "createdAt",
      "updatedAt",
      "relevance",
    ]);

    const safeSortBy = allowedSortFields.has(sortBy)
      ? sortBy
      : "createdAt";

    let sortCriteria: Record<string, any> = {};
    let projection: Record<string, any> = {};

    if (
      isTextSearch &&
      safeSortBy === "relevance"
    ) {
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
    } else {
      const field =
        safeSortBy === "relevance"
          ? "createdAt"
          : safeSortBy;

      sortCriteria[field] =
        sortOrder === "desc" ? -1 : 1;

      if (field !== "createdAt") {
        sortCriteria.createdAt = -1;
      }
    }

    try {
      const [data, total] = await Promise.all([
        Tier.find(query, projection)
          .sort(sortCriteria)
          .skip(skip)
          .limit(safeLimit)
          .lean(),

        Tier.countDocuments(query),
      ]);

      return {
        data,
        total,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error: any) {
      throw new Error(
        `Tier fetch failed: ${error.message}`,
      );
    }
  }
}
