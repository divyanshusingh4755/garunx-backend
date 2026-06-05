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
import { Component } from "../models/component.model.js";
import mongoose from "mongoose";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ComponentItem } from "../models/componentitem.model.js";

export class ServiceService {
  static async createService(payload: any) {
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

  static async updateService(serviceId: string, payload: any) {
    const {
      name,
      shortDescription,
      fullDescription,
      categoryId,
      thumbnailImage,
      bannerImage,
    } = payload;

    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const updateData: any = {};

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
      } else {
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

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedService) throw new Error("Service not found");
    return updatedService;
  }

  static async getServiceById(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId).lean();
    if (!service) throw new Error("Service not found");

    return service;
  }

  static async getDeactivationImpact(serviceId: string) {
    const [packageMappings, packagePricing, servicePricing] = await Promise.all(
      [
        // 1. Where service is used in packages
        PackageTierMap.find(
          { "services.serviceId": serviceId },
          { _id: 1, packageId: 1, tierId: 1 },
        ).lean(),

        // 2. Package pricing tied to this service
        PackageTierPricing.find({ serviceId }, { _id: 1 }).lean(),

        // 3. Service pricing (optional visibility)
        ServicePricing.find({ serviceId }, { _id: 1 }).lean(),
      ],
    );

    return {
      packageUsageCount: packageMappings.length,
      packagePricingCount: packagePricing.length,
      servicePricingCount: servicePricing.length,

      packageMappings,
      packagePricing,
      servicePricing,
    };
  }

  static async toggleServiceStatus(
    serviceId: string,
    isActive: boolean,
    confirmed = false,
  ) {
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

    if (!isActive && !confirmed) {
      const impact = await ServiceService.getDeactivationImpact(serviceId);

      return {
        requiresConfirmation: true,
        message: "This service is used in packages and pricing. Are you sure?",
        impact,
      };
    }

    if (isActive) {
      const validation =
        await ServiceService.validateServiceConfiguration(serviceId);

      if (!validation.isComplete) {
        throw new Error("Service configuration incomplete. Cannot activate.");
      }
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. Update Service
        await Service.findByIdAndUpdate(serviceId, { isActive }, { session });

        // 2. REMOVE service from Package mappings
        await PackageTierMap.updateMany(
          {
            "services.serviceId": serviceId,
          },
          {
            $pull: {
              services: {
                serviceId: new mongoose.Types.ObjectId(serviceId),
              },
            },
          },
          { session },
        );

        // 3. DELETE package pricing for this service
        await PackageTierPricing.deleteMany({ serviceId }, { session });
      });

      // 4. Run downstream cascading (components etc.)
      await ServiceCascadingEngine.run(serviceId);

      return {
        success: true,
        message: `Service ${
          isActive ? "activated" : "deactivated"
        } successfully`,
      };
    } finally {
      await session.endSession();
    }
  }

  static async getServicesByLocation(
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

      const [services, total] = await Promise.all([
        Service.find(matchQuery)
          .populate({
            path: "subServiceComponents",
            match: { isActive: true },
            select: "name description image isActive",
          })
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
          })
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean({ virtuals: true }),

        Service.countDocuments(matchQuery),
      ]);

      const data = services.map((service: any) => ({
        ...service,
        locations: service.locations.map((loc: any) => {
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
      throw new Error(`Fetching services by location failed: ${error.message}`);
    }
  }

  static async FindServices(
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

    if (isActive !== undefined) matchQuery.isActive = isActive;
    if (isComplete !== undefined) matchQuery.isComplete = isComplete;
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
      matchQuery.locationId = locationId;
    }

    if (searchTerm) matchQuery.$text = { $search: searchTerm };

    let sortCriteria: any = {};
    if (searchTerm && sortBy === "relevance") {
      sortCriteria = { score: { $meta: "textScore" } };
    } else {
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    try {
      const [data, total] = await Promise.all([
        Service.find(matchQuery)
          .populate({
            path: "subServiceComponents",
            match: { isActive: true },
            select: "name description image isActive",
          })
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
          .lean({ virtuals: true }),
        Service.countDocuments(matchQuery),
      ]);

      return { data, total, page, totalPages: Math.ceil(total / limit) };
    } catch (error: any) {
      throw new Error(`Service fetch failed: ${error.message}`);
    }
  }

  static async updateServiceLocations(
    serviceId: string,
    locations: { locationId: string }[],
  ) {
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

    const objectIds: Types.ObjectId[] = [];

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

    const formattedLocations = validLocations.map((loc: any) => ({
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

  static async removeServiceLocation(serviceId: string, locationId: string) {
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

    const exists = service.locations.some(
      (loc) => loc.locationId.toString() === locationId,
    );

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

    service.locations = service.locations.filter(
      (loc) => loc.locationId.toString() !== locationId,
    );

    await service.save();

    await ServiceCascadingEngine.run(serviceId);

    return {
      success: true,
      message: "Location removed successfully",
      locations: service.locations,
    };
  }

  static async updateServiceTiers(
    serviceId: string,
    tiers: { tierId: string }[],
  ) {
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

    const objectIds: Types.ObjectId[] = [];

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

    const isSame =
      currentIds.length === newIds.length &&
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

  static async removeServiceTier(serviceId: string, tierId: string) {
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

  static async getFullService(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId)
      .populate({
        path: "subServiceComponents",
        match: { isActive: true },
        select: "name description image isActive",
        options: { sort: { createdAt: -1 } },
      })
      .lean({ virtuals: true });

    if (!service) {
      throw new Error("Service not found");
    }

    const [serviceComponents, pricing, serviceCategory] = await Promise.all([
      ServiceComponent.find({ serviceId }).lean(),

      ServicePricing.find({ serviceId }).lean(),

      Category.findById(service.categoryId).select("label value image").lean(),
    ]);

    const componentIds = serviceComponents.map((c) => c.componentId);

    const componentDocs = await Component.find({
      _id: { $in: componentIds },
    }).lean();

    const componentMap = new Map(
      componentDocs.map((c) => [c._id.toString(), c]),
    );

    const itemIds = serviceComponents.flatMap(
      (c) => c.items?.map((i) => i.itemId) || [],
    );

    const itemDocs = await ComponentItem.find({
      _id: { $in: itemIds },
    }).lean();

    const itemMap = new Map(itemDocs.map((i) => [i._id.toString(), i]));

    const pricingMap = new Map<string, any[]>();

    for (const p of pricing) {
      const key = `${p.tierId}_${p.componentId}`;

      if (!pricingMap.has(key)) {
        pricingMap.set(key, []);
      }

      pricingMap.get(key)!.push({
        locationId: p.locationId,
        price: p.price,
      });
    }

    const grouped: Record<string, any> = {};

    for (const comp of serviceComponents) {
      const tierId = comp.tierId.toString();

      if (!grouped[tierId]) {
        grouped[tierId] = {
          tierId: comp.tierId,
          components: [],
        };
      }

      const pricingKey = `${comp.tierId}_${comp.componentId}`;

      const componentDetails = componentMap.get(comp.componentId.toString());

      grouped[tierId].components.push({
        componentId: comp.componentId,
        name: comp.name,
        description: comp.description,
        isRequired: comp.isRequired,
        component: componentDetails
          ? {
              id: componentDetails._id,
              image: componentDetails.imageUrl,
              isRemovable: componentDetails.isRemovable,
              isBundled: componentDetails.isBundled,
              isActive: componentDetails.isActive,
            }
          : null,

        items: (comp.items || []).map((item) => ({
          ...item,

          itemDetails: itemMap.get(item.itemId.toString()) || null,
        })),

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

        category: serviceCategory
          ? {
              id: serviceCategory._id,
              label: serviceCategory.label,
              value: serviceCategory.value,
              image: serviceCategory.image,
            }
          : null,

        isActive: service.isActive,
        isComplete: service.isComplete,
        serviceReference: service.serviceReference,
      },

      subServiceComponents: service.subServiceComponents || [],

      locations: service.locations,

      tiers: service.tiers.map((t) => ({
        tierId: t.tierId,
        name: t.name,
      })),

      components: grouped,
    };
  }

  static async getFullServiceByCities(serviceId: string, cityIds: string[]) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
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

    const service = await Service.findById(serviceId)
      .populate({
        path: "subServiceComponents",
        match: { isActive: true },
        select: "name description image isActive",
        options: { sort: { createdAt: -1 } },
      })
      .lean({ virtuals: true });

    if (!service) {
      throw new Error("Service not found");
    }

    const filteredLocations = service.locations
      .filter((loc: any) =>
        locationIds.some((id) => id.toString() === loc.locationId.toString()),
      )
      .map((loc: any) => ({
        ...loc,
        locationDetails: locationMap.get(loc.locationId.toString()) || null,
      }));

    const [components, pricing, componentDetails] = await Promise.all([
      ServiceComponent.find({ serviceId }).lean(),

      ServicePricing.find({
        serviceId,
        locationId: { $in: locationIds },
      }).lean(),

      Component.find({
        isActive: true,
      })
        .select("name imageUrl")
        .lean(),
    ]);

    const componentMap = new Map(
      componentDetails.map((comp: any) => [
        comp._id.toString(),
        {
          imageUrl: comp.imageUrl || null,
          name: comp.name,
        },
      ]),
    );

    const pricingMap = new Map<string, any[]>();

    for (const p of pricing) {
      const key = `${p.tierId}_${p.componentId}`;

      if (!pricingMap.has(key)) {
        pricingMap.set(key, []);
      }

      pricingMap.get(key)!.push({
        locationId: p.locationId,
        locationDetails: locationMap.get(p.locationId.toString()) || null,
        price: p.price,
      });
    }

    const grouped: Record<string, any> = {};

    for (const comp of components) {
      const tierId = comp.tierId.toString();

      const pricingKey = `${comp.tierId}_${comp.componentId}`;

      const componentPricing = pricingMap.get(pricingKey) || [];

      if (componentPricing.length === 0) {
        continue;
      }

      if (!grouped[tierId]) {
        grouped[tierId] = {
          tierId: comp.tierId,
          components: [],
        };
      }

      const componentInfo = componentMap.get(comp.componentId.toString());

      grouped[tierId].components.push({
        componentId: comp.componentId,
        name: comp.name,
        description: comp.description,
        isRequired: comp.isRequired,
        imageUrl: componentInfo?.imageUrl || null,
        items: comp.items || [],
        pricing: componentPricing,
      });
    }

    const filteredTiers = service.tiers.filter(
      (tier) => grouped[tier.tierId.toString()],
    );

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

      subServiceComponents: service.subServiceComponents || [],

      locations: filteredLocations,

      tiers: filteredTiers.map((t) => ({
        tierId: t.tierId,
        name: t.name,
      })),

      components: grouped,
    };
  }

  static async updateServiceStartingPrice(serviceId: string) {
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
    const tierComponentMap = new Map<string, string[]>();

    for (const component of components) {
      const tierId = component.tierId.toString();

      if (!tierComponentMap.has(tierId)) {
        tierComponentMap.set(tierId, []);
      }

      tierComponentMap.get(tierId)!.push(component.componentId.toString());
    }

    // fetch all pricing
    const pricing = await ServicePricing.find({
      serviceId,
    }).lean();

    // build pricing lookup
    const pricingMap = new Map<string, number>();

    for (const p of pricing) {
      const key = `${p.tierId}_${p.locationId}_${p.componentId}`;

      pricingMap.set(key, p.price);
    }

    let minimumPrice = Infinity;

    // calculate each tier/location combination
    for (const [tierId, componentIds] of tierComponentMap.entries()) {
      const locationIds = [
        ...new Set(
          pricing
            .filter((p) => p.tierId.toString() === tierId)
            .map((p) => p.locationId.toString()),
        ),
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

  static async validateServiceConfiguration(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new Error("Invalid serviceId");
    }

    const service = await Service.findById(serviceId).lean();

    if (!service) {
      throw new Error("Service not found");
    }

    const issues: string[] = [];

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

    const pricingMap = new Set(
      pricing.map((p) => `${p.tierId}_${p.locationId}_${p.componentId}`),
    );

    const tierComponentMap = new Map<string, any[]>();

    for (const c of requiredComponents) {
      const tierId = c.tierId.toString();

      if (!tierComponentMap.has(tierId)) {
        tierComponentMap.set(tierId, []);
      }

      tierComponentMap.get(tierId)!.push(c);
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

      if (hasValidCombination) break;
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
