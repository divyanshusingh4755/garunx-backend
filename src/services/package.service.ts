import { Types } from "mongoose";

import { Package } from "../models/package.model.js";
import { Category } from "../models/category.model.js";
import { Tier } from "../models/tier.model.js";
import { Location } from "../models/location.model.js";
import { Service } from "../models/service.model.js";

import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";

import { generateSlug } from "../utils/generateSlug.js";
import { getNextSequence } from "../utils/getNextSequence.js";

import { PackageCascadingEngine } from "./package-cascading-engine.service.js";

export class PackageService {
  static async createPackage(payload: any) {
    let {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = payload;

    name = name?.trim();
    shortDescription = shortDescription?.trim();
    fullDescription = fullDescription?.trim();

    if (!name || !shortDescription || !categoryId) {
      throw new Error("Missing required fields");
    }

    if (!Types.ObjectId.isValid(categoryId)) {
      throw new Error("Invalid categoryId format");
    }

    const categoryExists = await Category.exists({
      _id: categoryId,
    });

    if (!categoryExists) {
      throw new Error("Invalid categoryId");
    }

    const slug = generateSlug(name);

    const seq = await getNextSequence(`package_${slug}`);

    const packageReference = `${slug}_${String(seq).padStart(4, "0")}`;

    const pkg = await Package.create({
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
      locations: [],
      tiers: [],
      packageReference,
      isActive: false,
      isComplete: false,
    });

    return pkg;
  }

  static async updatePackage(packageId: string, payload: any) {
    const {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = payload;

    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error("Package name cannot be empty");
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
      if (typeof fullDescription !== "string") {
        throw new Error("Invalid fullDescription");
      }

      updateData.fullDescription = fullDescription.trim();
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

      const categoryExists = await Category.exists({
        _id: categoryId,
      });

      if (!categoryExists) {
        throw new Error("Invalid categoryId");
      }

      updateData.categoryId = categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedPackage;
  }

  static async getPackageById(packageId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId).lean();

    if (!pkg) {
      throw new Error("Package not found");
    }

    return pkg;
  }

  static async togglePackageStatus(packageId: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    if (pkg.isActive === isActive) {
      return {
        success: true,
        message: `Package already ${isActive ? "active" : "inactive"}`,
      };
    }

    if (isActive) {
      const validation =
        await PackageService.validatePackageConfiguration(packageId);

      if (!validation.isComplete) {
        throw new Error("Package configuration incomplete. Cannot activate.");
      }
    }

    pkg.isActive = isActive;

    await pkg.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: `Package ${isActive ? "activated" : "deactivated"} successfully`,
    };
  }

  static async findPackages(
    searchTerm?: string,
    categoryId?: string,
    locationId?: string,
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    isComplete?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = (page - 1) * limit;

    const matchQuery: any = {};

    if (isActive !== undefined) {
      matchQuery.isActive = isActive;
    }

    if (isComplete !== undefined) {
      matchQuery.isComplete = isComplete;
    }

    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid categoryId");
      }

      matchQuery.categoryId = categoryId;
    }

    if (locationId) {
      if (!Types.ObjectId.isValid(locationId)) {
        throw new Error("Invalid locationId");
      }

      matchQuery["locations.locationId"] = locationId;
    }

    if (searchTerm) {
      matchQuery.$text = {
        $search: searchTerm,
      };
    }

    let sortCriteria: any = {};

    if (searchTerm && sortBy === "relevance") {
      sortCriteria = {
        score: {
          $meta: "textScore",
        },
      };
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const [data, total] = await Promise.all([
      Package.find(matchQuery)
        .select({
          name: 1,
          shortDescription: 1,
          thumbnailImage: 1,
          categoryId: 1,
          isActive: 1,
          isComplete: 1,
          packageReference: 1,
          locations: 1,
          tiers: 1,
          startingPrice: 1,
          createdAt: 1,
          ...(searchTerm && {
            score: {
              $meta: "textScore",
            },
          }),
        })
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),

      Package.countDocuments(matchQuery),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async updatePackageLocations(
    packageId: string,
    locations: { locationId: string }[],
  ) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    if (!Array.isArray(locations) || locations.length === 0) {
      throw new Error("At least one location is required");
    }

    const uniqueIds = [...new Set(locations.map((l) => l.locationId))];

    const objectIds: Types.ObjectId[] = [];

    for (const id of uniqueIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid locationId: ${id}`);
      }

      objectIds.push(new Types.ObjectId(id));
    }

    const validLocations = await Location.find({
      _id: {
        $in: objectIds,
      },
    }).select("_id name");

    if (validLocations.length !== objectIds.length) {
      throw new Error("One or more locationIds are invalid");
    }

    pkg.locations = validLocations.map((loc: any) => ({
      locationId: loc._id,
      name: loc.name,
      isActive: true,
    }));

    await pkg.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Package locations updated successfully",
      locations: pkg.locations,
    };
  }

  static async removePackageLocation(packageId: string, locationId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(locationId)) {
      throw new Error("Invalid locationId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    const exists = pkg.locations.some(
      (loc) => loc.locationId.toString() === locationId,
    );

    if (!exists) {
      return {
        success: true,
        message: "Location already not present",
        locations: pkg.locations,
      };
    }

    if (pkg.locations.length === 1) {
      throw new Error("Package must have at least one location");
    }

    pkg.locations = pkg.locations.filter(
      (loc) => loc.locationId.toString() !== locationId,
    );

    await pkg.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Location removed successfully",
      locations: pkg.locations,
    };
  }

  static async updatePackageTiers(
    packageId: string,
    tiers: { tierId: string }[],
  ) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      throw new Error("At least one tier is required");
    }

    const uniqueIds = [...new Set(tiers.map((t) => t.tierId))];

    const objectIds: Types.ObjectId[] = [];

    for (const id of uniqueIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid tierId: ${id}`);
      }

      objectIds.push(new Types.ObjectId(id));
    }

    const validTiers = await Tier.find({
      _id: {
        $in: objectIds,
      },
    }).select("_id name");

    if (validTiers.length !== objectIds.length) {
      throw new Error("One or more tierIds are invalid");
    }

    pkg.tiers = validTiers.map((tier: any) => ({
      tierId: tier._id,
      name: tier.name,
    }));

    await pkg.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Package tiers updated successfully",
      tiers: pkg.tiers,
    };
  }

  static async removePackageTier(packageId: string, tierId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Types.ObjectId.isValid(tierId)) {
      throw new Error("Invalid tierId");
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new Error("Package not found");
    }

    const exists = pkg.tiers.some((t) => t.tierId.toString() === tierId);

    if (!exists) {
      return {
        success: true,
        message: "Tier already not present",
      };
    }

    if (pkg.tiers.length === 1) {
      throw new Error("Package must have at least one tier");
    }

    pkg.tiers = pkg.tiers.filter((t) => t.tierId.toString() !== tierId);

    await pkg.save();

    await PackageCascadingEngine.run(packageId);

    return {
      success: true,
      message: "Tier removed successfully",
      tiers: pkg.tiers,
    };
  }

  static async getFullPackage(packageId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId).lean();

    if (!pkg) {
      throw new Error("Package not found");
    }

    const [mappings, pricing] = await Promise.all([
      PackageTierMap.find({
        packageId,
      }).lean(),

      PackageTierPricing.find({
        packageId,
      }).lean(),
    ]);

    const groupedMappings: Record<string, any> = {};

    for (const map of mappings) {
      const tierId = map.tierId.toString();

      if (!groupedMappings[tierId]) {
        groupedMappings[tierId] = {
          tierId: map.tierId,
          services: [],
        };
      }

      for (const service of map.services || []) {
        groupedMappings[tierId].services.push({
          serviceId: service.serviceId,
          name: service.name,
          isRequired: service.isRequired,
        });
      }
    }

    const groupedPricing: Record<string, any> = {};

    for (const price of pricing) {
      groupedPricing[price.tierId.toString()] = {
        tierId: price.tierId,
        basePrice: price.basePrice,
        fixedPrice: price.fixedPrice,
        discountPercent: price.discountPercent,
        finalPrice: price.finalPrice,
        serviceId: price.serviceId,
        locationId: price.locationId,
      };
    }

    return {
      package: {
        id: pkg._id,
        name: pkg.name,
        shortDescription: pkg.shortDescription,
        fullDescription: pkg.fullDescription,
        thumbnailImage: pkg.thumbnailImage,
        bannerImage: pkg.bannerImage,
        isActive: pkg.isActive,
        isComplete: pkg.isComplete,
        packageReference: pkg.packageReference,
      },

      locations: pkg.locations,

      tiers: pkg.tiers,

      mappings: groupedMappings,

      pricing: groupedPricing,
    };
  }

  static async updatePackageStartingPrice(packageId: string) {
    const pricing = await PackageTierPricing.find({
      packageId,
    }).lean();

    if (!pricing.length) {
      await Package.findByIdAndUpdate(packageId, {
        startingPrice: 0,
      });

      return;
    }

    const minimumPrice = Math.min(...pricing.map((p) => p.finalPrice));

    await Package.findByIdAndUpdate(packageId, {
      startingPrice: minimumPrice,
    });
  }

  static async validatePackageConfiguration(packageId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    const pkg = await Package.findById(packageId).lean();

    if (!pkg) {
      throw new Error("Package not found");
    }

    const issues: string[] = [];

    if (!pkg.locations.length) {
      issues.push("No locations configured");
    }

    if (!pkg.tiers.length) {
      issues.push("No tiers configured");
    }

    const mappings = await PackageTierMap.find({
      packageId,
    }).lean();

    if (!mappings.length) {
      issues.push("No services mapped");
    }

    const pricing = await PackageTierPricing.find({
      packageId,
    }).lean();

    if (!pricing.length) {
      issues.push("No pricing configured");
    }

    for (const tier of pkg.tiers) {
      const tierMappings = mappings.filter(
        (m) => m.tierId.toString() === tier.tierId.toString(),
      );

      if (!tierMappings.length) {
        issues.push(`No services mapped for tier ${tier.name}`);
      }

      const tierPricing = pricing.find(
        (p) => p.tierId.toString() === tier.tierId.toString(),
      );

      if (!tierPricing) {
        issues.push(`No pricing configured for tier ${tier.name}`);
      }
    }

    const requiredServiceIds = mappings.flatMap((m) =>
      (m.services || [])
        .filter((s: any) => s.isRequired)
        .map((s: any) => s.serviceId.toString()),
    );

    if (requiredServiceIds.length) {
      const services = await Service.find({
        _id: {
          $in: requiredServiceIds,
        },
      })
        .select("isActive isComplete")
        .lean();

      const invalidServices = services.filter(
        (s) => !s.isActive || !s.isComplete,
      );

      if (invalidServices.length) {
        issues.push("One or more required services are inactive or incomplete");
      }
    }

    const isComplete = issues.length === 0;

    await Package.findByIdAndUpdate(packageId, {
      isComplete,
    });

    return {
      isComplete,
      issues,
    };
  }

  static async getFullPackageByCities(packageId: string, cityIds: string[]) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new Error("Invalid packageId");
    }

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      throw new Error("cityIds must be a non-empty array");
    }

    const invalidCityIds = cityIds.filter((id) => !Types.ObjectId.isValid(id));

    if (invalidCityIds.length > 0) {
      throw new Error(`Invalid cityIds: ${invalidCityIds.join(", ")}`);
    }

    const locations = await Location.find({
      cityId: {
        $in: cityIds.map((id) => new Types.ObjectId(id)),
      },
      isActive: true,
    })
      .populate({
        path: "cityId",
        select: "name",
      })
      .select("_id name cityId")
      .lean();

    const locationIds = locations.map((loc) => loc._id);

    const locationMap = new Map(
      locations.map((loc: any) => [
        loc._id.toString(),
        {
          locationId: loc._id,
          locationName: loc.name,
          city: loc.cityId,
        },
      ]),
    );

    const pkg = await Package.findById(packageId)
      .populate({
        path: "tiers.tierId",
        select: "name",
      })
      .lean({ virtuals: true });

    if (!pkg) {
      throw new Error("Package not found");
    }

    const filteredLocations = pkg.locations
      .filter((loc: any) =>
        locationIds.some((id) => id.toString() === loc.locationId.toString()),
      )
      .map((loc: any) => ({
        ...loc,
        locationDetails: locationMap.get(loc.locationId.toString()) || null,
      }));

    const [tierMaps, pricing] = await Promise.all([
      PackageTierMap.find({ packageId }).lean(),

      PackageTierPricing.find({
        packageId,
        locationId: { $in: locationIds },
      }).lean(),
    ]);

    const pricingMap = new Map<string, any[]>();

    for (const p of pricing) {
      const key = `${p.tierId}_${p.serviceId}`;

      if (!pricingMap.has(key)) {
        pricingMap.set(key, []);
      }

      pricingMap.get(key)!.push({
        locationId: p.locationId,
        locationDetails: locationMap.get(p.locationId.toString()) || null,
        basePrice: p.basePrice,
        fixedPrice: p.fixedPrice,
        discountPercent: p.discountPercent,
        finalPrice: p.finalPrice,
      });
    }

    const grouped: Record<string, any> = {};
    for (const tierMap of tierMaps) {
      const tierId = tierMap.tierId.toString();

      if (!grouped[tierId]) {
        grouped[tierId] = {
          tierId: tierMap.tierId,
          services: [],
        };
      }

      for (const service of tierMap.services) {
        const key = `${tierMap.tierId}_${service.serviceId}`;

        const servicePricing = pricingMap.get(key) || [];

        if (servicePricing.length === 0) continue;

        grouped[tierId].services.push({
          serviceId: service.serviceId,
          name: service.name,
          isRequired: service.isRequired,
          pricing: servicePricing,
        });
      }
    }

    const filteredTiers = pkg.tiers.filter((t) => grouped[t.tierId.toString()]);

    return {
      package: {
        id: pkg._id,
        name: pkg.name,
        shortDescription: pkg.shortDescription,
        fullDescription: pkg.fullDescription,
        thumbnailImage: pkg.thumbnailImage,
        bannerImage: pkg.bannerImage,
        isActive: pkg.isActive,
        isComplete: pkg.isComplete,
        packageReference: pkg.packageReference,
      },

      locations: filteredLocations,

      tiers: filteredTiers.map((t) => ({
        tierId: t.tierId,
        name: t.name,
      })),

      components: grouped, // (services grouped under tiers)
    };
  }

  static async getPackagesByLocation(
    cityIds: string[],
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    isComplete?: boolean,
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ) {
    const skip = (page - 1) * limit;

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      throw new Error("cityIds must be a non-empty array");
    }

    const invalidIds = cityIds.filter((id) => !Types.ObjectId.isValid(id));

    if (invalidIds.length > 0) {
      throw new Error(`Invalid cityIds: ${invalidIds.join(", ")}`);
    }

    try {
      const locations = await Location.find({
        cityId: {
          $in: cityIds.map((id) => new Types.ObjectId(id)),
        },
        isActive: true,
      })
        .populate({
          path: "cityId",
          select: "name",
        })
        .select("_id cityId name")
        .lean();

      const locationIds = locations.map((loc) => loc._id);

      const locationMap = new Map(
        locations.map((loc: any) => [
          loc._id.toString(),
          {
            locationId: loc._id,
            locationName: loc.name,
            city: loc.cityId,
          },
        ]),
      );

      const matchQuery: any = {
        "locations.locationId": {
          $in: locationIds,
        },
      };

      if (isActive !== undefined) {
        matchQuery.isActive = isActive;
      }

      if (isComplete !== undefined) {
        matchQuery.isComplete = isComplete;
      }

      const sortCriteria: any = {
        [sortBy]: sortOrder === "desc" ? -1 : 1,
      };

      const [packages, total] = await Promise.all([
        Package.find(matchQuery)
          .populate({
            path: "tiers.tierId",
            select: "name",
          })
          .select({
            name: 1,
            shortDescription: 1,
            thumbnailImage: 1,
            bannerImage: 1,
            categoryId: 1,
            isActive: 1,
            packageReference: 1,
            createdAt: 1,
            isComplete: 1,
            locations: 1,
            tiers: 1,
          })
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean({ virtuals: true }),

        Package.countDocuments(matchQuery),
      ]);

      const data = packages.map((pkg: any) => ({
        ...pkg,
        locations: pkg.locations.map((loc: any) => {
          const mappedLocation = locationMap.get(loc.locationId.toString());

          return {
            ...loc,
            locationDetails: mappedLocation || null,
          };
        }),
      }));

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Fetching packages by location failed: ${error.message}`);
    }
  }
}
