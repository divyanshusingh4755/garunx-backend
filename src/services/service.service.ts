import mongoose, { Types, type QueryFilter, type SortOrder } from "mongoose";
import { Service, type IService } from "../models/service.model.js";
import { Category } from "../models/category.model.js";
import { generateSlug } from "../utils/generateSlug.js";
import { getNextSequence } from "../utils/getNextSequence.js";
import { Tier } from "../models/tier.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Location } from "../models/location.model.js";
import { ServiceCascadingEngine } from "./cascading-engine.service.js";
import { Component } from "../models/component.model.js";
import { ComponentItem } from "../models/componentitem.model.js";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";

type CreateServiceInput = {
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: string;
  thumbnailImage: string;
  bannerImage?: string;
  commissionPercentage?: number;
};

type UpdateServiceInput = Partial<Pick<IService, | "name" | "shortDescription" | "fullDescription" | "thumbnailImage" | "bannerImage" | "commissionPercentage">> & { categoryId?: string; };

const createHttpError = (message: string, statusCode: number) => {
  const error = new Error(message) as Error & { statusCode: number; };
  error.statusCode = statusCode;
  return error;
};

export class ServiceService {
  private static async invalidateServiceCache(serviceId?: string): Promise<void> {
    const operations: Promise<unknown>[] = [
      RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
      RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
    ];

    if (serviceId) {
      operations.push(
        RedisCacheService.delete(CacheKeys.serviceDetail(serviceId)),
        RedisCacheService.delete(CacheKeys.serviceFull(serviceId)),
        RedisCacheService.deleteByPattern(CacheKeys.serviceFullByCitiesPattern(serviceId)),
      );
    }

    await Promise.all(operations);
  }

  private static async invalidatePackageCaches(): Promise<void> {
    await Promise.all([
      RedisCacheService.deleteByPattern(CacheKeys.packageListPattern()),
      RedisCacheService.deleteByPattern(CacheKeys.packageByLocationListPattern()),
      RedisCacheService.deleteByPattern(CacheKeys.packageDetailPattern()),
      RedisCacheService.deleteByPattern(CacheKeys.packageFullPattern()),
      RedisCacheService.deleteByPattern(CacheKeys.packageResolvedPricingPattern()),
    ]);
  }

  private static async buildFullServiceData(service: any, options?: { publicView?: boolean; }) {
    const serviceId = service._id.toString();
    const publicView = options?.publicView === true;

    // Determine Tier IDs. PUBLIC: only globally active tiers. ADMIN: every tier attached to Service.
    const serviceTierIds = (service.tiers ?? []).map((tier: any) => tier.tierId);
    let validTierIds: Types.ObjectId[] = serviceTierIds;

    if (publicView) {
      const activeTierDocs = await Tier.find({ _id: { $in: serviceTierIds }, isActive: true }).select("_id").lean();
      validTierIds = activeTierDocs.map((tier) => tier._id);
    }

    const validTierIdSet = new Set(validTierIds.map((id) => id.toString()));

    // Determine Location IDs. PUBLIC: embedded location must be active AND global Location must be active. ADMIN: every attached location.
    const candidateLocations = publicView ? (service.locations ?? []).filter((location: any) => location.isActive) : (service.locations ?? []);

    const serviceLocationIds = candidateLocations.map((location: any) => location.locationId);
    let validLocationIds: Types.ObjectId[] = serviceLocationIds;

    if (publicView) {
      const activeLocationDocs = await Location.find({ _id: { $in: serviceLocationIds }, isActive: true }).select("_id").lean();
      validLocationIds = activeLocationDocs.map((location) => location._id);
    }

    const validLocationIdSet = new Set(validLocationIds.map((id) => id.toString()));

    // Load Service Components + Pricing + Category.
    const serviceComponentQuery: Record<string, unknown> = { serviceId: service._id };
    const pricingQuery: Record<string, unknown> = { serviceId: service._id };

    if (publicView) {
      serviceComponentQuery.tierId = { $in: validTierIds };
      pricingQuery.tierId = { $in: validTierIds };
      pricingQuery.locationId = { $in: validLocationIds };
      pricingQuery.isActive = true;
    }

    const pricingBuilder = ServicePricing.find(pricingQuery).select(["tierId", "componentId", "locationId", "price", "taxProfileId", "taxPriceMode", "isActive"].join(" "));

    // PUBLIC: only currently active TaxProfile. ADMIN: populate even inactive TaxProfile so configuration can be diagnosed.
    pricingBuilder.populate({
      path: "taxProfileId", ...(publicView ? { match: { isActive: true } } : {}),
      select: "name code treatment totalRate isActive",
    });

    const [serviceComponents, pricing, serviceCategory] =
      await Promise.all([
        ServiceComponent.find(serviceComponentQuery).lean(),
        pricingBuilder.lean(),
        Category.findById(service.categoryId).select("label value image").lean(),
      ]);

    // Component IDs.
    const componentIds = [...new Set(serviceComponents.map((component) => component.componentId.toString()))];

    // PUBLIC: active Components only. ADMIN: include inactive Components.
    const componentQuery: Record<string, unknown> = { _id: { $in: componentIds.map((id) => new Types.ObjectId(id)) } };

    if (publicView) { componentQuery.isActive = true; }

    const componentDocs = componentIds.length > 0 ? await Component.find(componentQuery).lean() : [];
    const componentMap = new Map(componentDocs.map((component: any) => [component._id.toString(), component]));

    // Component Item IDs.
    const itemIds = [...new Set(serviceComponents.flatMap((component) => (component.items ?? []).map((item) => item.itemId.toString())))];
    const itemQuery: Record<string, unknown> = { _id: { $in: itemIds.map((id) => new Types.ObjectId(id)) } };

    if (publicView) { itemQuery.isActive = true; }
    const itemDocs = itemIds.length > 0 ? await ComponentItem.find(itemQuery).lean() : [];
    const itemMap = new Map(itemDocs.map((item: any) => [item._id.toString(), item]));

    // Pricing grouped by: tier + component
    const pricingMap = new Map<string, any[]>();
    for (const price of pricing) {
      const tierId = price.tierId.toString();
      const locationId = price.locationId.toString();

      // Public defensive filtering.
      if (publicView && (!validTierIdSet.has(tierId) || !validLocationIdSet.has(locationId) || !price.isActive)) { continue; }
      const key = `${tierId}_${price.componentId.toString()}`;
      const existing = pricingMap.get(key) ?? [];

      const taxProfile = price.taxProfileId as { _id: Types.ObjectId; name?: string; code?: string; treatment?: string; totalRate?: number; isActive?: boolean; } | null | undefined;

      existing.push({
        locationId: price.locationId,
        price: price.price,
        isActive: price.isActive,
        tax: {
          taxProfileId: taxProfile?._id ?? null,
          profileName: taxProfile?.name ?? null,
          profileCode: taxProfile?.code ?? null,
          treatment: taxProfile?.treatment ?? null,
          totalRate: taxProfile?.totalRate ?? 0,
          priceMode: taxProfile ? (price.taxPriceMode ?? "EXCLUSIVE") : "EXCLUSIVE",
          isTaxConfigured: Boolean(taxProfile),
          // Useful for ADMIN diagnostics.
          taxProfileActive: taxProfile?.isActive ?? false,
        },
      });

      pricingMap.set(key, existing);
    }

    // Build components grouped by tier.
    const grouped: Record<string, { tierId: Types.ObjectId; components: any[]; }> = {};

    for (const serviceComponent of serviceComponents) {
      const tierId = serviceComponent.tierId.toString();

      // Public: globally inactive Tier is hidden.
      if (publicView && !validTierIdSet.has(tierId)) { continue; }
      const componentId = serviceComponent.componentId.toString();
      const componentDetails = componentMap.get(componentId);

      // Public: inactive/missing Component is hidden. Admin: preserve mapping even if canonical Component is missing.
      if (publicView && !componentDetails) { continue; }

      const pricingKey = `${tierId}_${componentId}`;
      const componentPricing = pricingMap.get(pricingKey) ?? [];

      // Public configuration without active pricing is unusable.
      if (publicView && componentPricing.length === 0) { continue; }

      // Hydrate component items.
      const hydratedItems = (serviceComponent.items ?? []).filter((item) =>
        !publicView || itemMap.has(item.itemId.toString())).map((item) => {
          const itemDetails = itemMap.get(item.itemId.toString());
          return {
            ...item,
            itemDetails: itemDetails ?? null,
            // Helpful to admin when referenced item was removed/inactivated.
            isAvailable: Boolean(itemDetails),
          };
        },
        );

      if (!grouped[tierId]) {
        grouped[tierId] = {
          tierId: serviceComponent.tierId,
          components: [],
        };
      }

      grouped[tierId].components.push({
        componentId: serviceComponent.componentId,
        name: serviceComponent.name,
        description: serviceComponent.description,
        isRequired: serviceComponent.isRequired,
        // Canonical Component details.
        component: componentDetails ? {
          id: componentDetails._id,
          name: componentDetails.name,
          image: componentDetails.imageUrl,
          isRemovable: componentDetails.isRemovable,
          isBundled: componentDetails.isBundled,
          isActive: componentDetails.isActive,
        } : null,

        // Indicates orphaned/missing Component.
        componentAvailable: Boolean(componentDetails),
        items: hydratedItems,
        pricing: componentPricing,
      });
    }

    // Locations.
    const filteredLocations = publicView ? (service.locations ?? []).filter((location: any) => location.isActive && validLocationIdSet.has(location.locationId.toString())) : (service.locations ?? []);

    // Tiers. PUBLIC: active global Tier AND must contain usable components. ADMIN: all configured tiers.
    const filteredTiers = (service.tiers ?? []).filter((tier: any) => {
      if (!publicView) { return true; } const tierId = tier.tierId.toString();
      return (validTierIdSet.has(tierId) && Boolean(grouped[tierId]));
    },
    );

    // Final response.
    return {
      service: {
        id: service._id,
        name: service.name,
        shortDescription: service.shortDescription,
        fullDescription: service.fullDescription,
        thumbnailImage: service.thumbnailImage,
        bannerImage: service.bannerImage,
        startingPrice: service.startingPrice,
        ...(!publicView && { commissionPercentage: service.commissionPercentage }),
        category: serviceCategory ? { id: serviceCategory._id, label: serviceCategory.label, value: serviceCategory.value, image: serviceCategory.image } : null,
        isActive: service.isActive,
        isComplete: service.isComplete,
        serviceReference: service.serviceReference,
      },

      subServiceComponents: service.subServiceComponents ?? [],
      locations: filteredLocations,
      tiers: filteredTiers.map((tier: any) => ({ tierId: tier.tierId, name: tier.name, components: grouped[tier.tierId.toString()]?.components ?? [] })),
      components: grouped,
    };
  }

  static async createService(payload: CreateServiceInput) {
    const name = payload.name.trim();
    const shortDescription = payload.shortDescription.trim();
    const fullDescription = payload.fullDescription.trim();
    const categoryId = payload.categoryId;
    const thumbnailImage = payload.thumbnailImage.trim();

    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) { throw createHttpError("Category not found", 404); }

    const slug = generateSlug(name);
    const sequence = await getNextSequence(`service_${slug}`);

    const serviceReference = `${slug}_${String(sequence).padStart(4, "0")}`;

    const service = await Service.create({ name, shortDescription, fullDescription, categoryId, thumbnailImage, locations: [], tiers: [], serviceReference, isActive: false, isComplete: false, startingPrice: 0, commissionPercentage: payload.commissionPercentage ?? 0, ...(payload.bannerImage !== undefined && { bannerImage: payload.bannerImage }) });
    await this.invalidateServiceCache();
    return service;
  }

  static async updateService(serviceId: string, payload: UpdateServiceInput) {
    const updateData: UpdateServiceInput = {};

    if (payload.name !== undefined) { updateData.name = payload.name.trim(); }
    if (payload.shortDescription !== undefined) { updateData.shortDescription = payload.shortDescription.trim(); }
    if (payload.fullDescription !== undefined) { updateData.fullDescription = payload.fullDescription.trim(); }
    if (payload.thumbnailImage !== undefined) { updateData.thumbnailImage = payload.thumbnailImage; }
    if (payload.bannerImage !== undefined) { updateData.bannerImage = payload.bannerImage; }
    if (payload.commissionPercentage !== undefined) { updateData.commissionPercentage = payload.commissionPercentage; }
    if (payload.categoryId !== undefined) {
      const categoryExists = await Category.exists({ _id: payload.categoryId });
      if (!categoryExists) { throw createHttpError("Category not found", 404); }
      updateData.categoryId = payload.categoryId;
    }

    const updatedService = await Service.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true, runValidators: true }).lean();
    if (!updatedService) { throw createHttpError("Service not found", 404); }
    await this.invalidateServiceCache(serviceId);
    return updatedService;
  }

  static async getServiceById(serviceId: string) {
    return RedisCacheService.getOrSet({
      key: CacheKeys.serviceDetail(serviceId),
      ttlSeconds: CACHE_TTL_SECONDS.SERVICE_DETAIL,
      loader: async () => {
        const service = await Service.findById(serviceId).lean();
        if (!service) { throw createHttpError("Service not found", 404); }
        return service;
      },
    });
  }

  static async getDeactivationImpact(serviceId: string) {
    const serviceObjectId = new Types.ObjectId(serviceId);

    const [packageMappings, packagePricing, servicePricing] = await Promise.all(
      [
        PackageTierMap.find({ services: { $elemMatch: { serviceId: serviceObjectId } } }, { _id: 1, packageId: 1, tierId: 1 }).lean(),
        PackageTierPricing.find({ serviceId: serviceObjectId }, { _id: 1 }).lean(),
        ServicePricing.find({ serviceId: serviceObjectId }, { _id: 1 }).lean(),
      ],
    );

    return { packageUsageCount: packageMappings.length, packagePricingCount: packagePricing.length, servicePricingCount: servicePricing.length, packageMappings, packagePricing, servicePricing };
  }

  static async toggleServiceStatus(serviceId: string, isActive: boolean, confirmed = false) {
    const service = await Service.findById(serviceId).select("_id isActive").lean();
    if (!service) { throw createHttpError("Service not found", 404); }
    if (service.isActive === isActive) {
      return { success: true, unchanged: true, service };
    }

    if (!isActive && !confirmed) {
      const impact = await this.getDeactivationImpact(serviceId);
      if (impact.packageUsageCount > 0 || impact.packagePricingCount > 0 || impact.servicePricingCount > 0) {
        return { requiresConfirmation: true, impact };
      }
    }

    if (isActive) {
      const validation = await this.validateServiceConfiguration(serviceId);
      if (!validation.isComplete) { throw createHttpError("Service configuration incomplete. Cannot activate.", 400); }
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedService = await Service.findByIdAndUpdate(serviceId, { $set: { isActive } }, { new: true, session }).lean();
      if (!updatedService) { throw createHttpError("Service not found", 404); }

      if (!isActive) {
        await Promise.all([
          ServicePricing.updateMany({ serviceId: new Types.ObjectId(serviceId), isActive: true }, { $set: { isActive: false } }, { session }),
          PackageTierPricing.updateMany({ serviceId: new Types.ObjectId(serviceId), isActive: true }, { $set: { isActive: false } }, { session },
          ),
        ]);
      }

      await session.commitTransaction();

      if (isActive) { await ServiceCascadingEngine.run(serviceId); }
      await this.invalidateServiceCache(serviceId);

      if (!isActive) { await this.invalidatePackageCaches(); }

      return { success: true, service: updatedService };
    } catch (error) {
      if (session.inTransaction()) { await session.abortTransaction(); }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async getServicesByLocation(params: { cityIds?: string[]; categoryIds?: string[]; limit?: number; page?: number; isActive?: boolean; isComplete?: boolean; sortBy?: string; sortOrder?: "asc" | "desc"; }) {
    const { cityIds, categoryIds, limit = 20, page = 1, isActive, isComplete, sortBy = "createdAt", sortOrder = "desc" } = params;

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;
    const allowedSortFields = new Set(["name", "createdAt", "updatedAt", "startingPrice", "isActive", "isComplete"]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
    const cacheKey = CacheKeys.serviceByLocationList({ cityIds, categoryIds, limit: safeLimit, page: safePage, isActive, isComplete, sortBy: safeSortBy, sortOrder });

    return RedisCacheService.getOrSet({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS.SERVICE_BY_LOCATION,
      loader: async () => {
        const matchQuery: QueryFilter<IService> = {};

        if (cityIds?.length) {
          const locations = await Location.find({ cityId: { $in: cityIds.map((id) => new Types.ObjectId(id)) }, isActive: true }).select("_id").lean();
          matchQuery["locations.locationId"] = { $in: locations.map((location) => location._id) };
        }
        if (typeof isActive === "boolean") { matchQuery.isActive = isActive; }
        if (typeof isComplete === "boolean") { matchQuery.isComplete = isComplete; }
        if (categoryIds?.length) {
          matchQuery.categoryId = { $in: categoryIds.map((id) => new Types.ObjectId(id)) };
        }

        const sortCriteria: Record<string, SortOrder> = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };

        const [services, total] = await Promise.all([
          Service.find(matchQuery).
            populate({
              path: "subServiceComponents", match: { isActive: true },
              select: "name description image isActive",
            })
            .select({ name: 1, shortDescription: 1, thumbnailImage: 1, categoryId: 1, isActive: 1, serviceReference: 1, createdAt: 1, isComplete: 1, startingPrice: 1, locations: 1, tiers: 1 })
            .sort(sortCriteria).skip(skip).limit(safeLimit).lean({ virtuals: true }),

          Service.countDocuments(matchQuery),
        ]);

        return {
          data: services, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
        };
      },
    });
  }

  static async findServices(params: { searchTerm?: string; categoryId?: string; locationId?: string; limit?: number; page?: number; isActive?: boolean; isComplete?: boolean; sortBy?: string; sortOrder?: "asc" | "desc"; }) {
    const { searchTerm, categoryId, locationId, limit = 20, page = 1, isActive, isComplete, sortBy = "createdAt", sortOrder = "desc" } = params;
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;
    const term = searchTerm?.trim();
    const useTextSearch = Boolean(term && term.length > 4);
    const allowedSortFields = new Set(["name", "createdAt", "updatedAt", "startingPrice", "isActive", "isComplete"]);
    const safeSortBy = useTextSearch && sortBy === "relevance" ? "relevance" : allowedSortFields.has(sortBy) ? sortBy : "createdAt";
    const cacheKey = CacheKeys.serviceList({ searchTerm, categoryId, locationId, limit: safeLimit, page: safePage, isActive, isComplete, sortBy: safeSortBy, sortOrder });

    return RedisCacheService.getOrSet({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS.SERVICE_LIST,
      loader: async () => {
        const matchQuery: QueryFilter<IService> = {};
        if (typeof isActive === "boolean") { matchQuery.isActive = isActive; }
        if (typeof isComplete === "boolean") { matchQuery.isComplete = isComplete; }
        if (categoryId) { matchQuery.categoryId = new Types.ObjectId(categoryId); }
        if (locationId) { matchQuery["locations.locationId"] = new Types.ObjectId(locationId); }
        if (term) {
          if (useTextSearch) {
            matchQuery.$text = { $search: term };
          } else {
            matchQuery.name = { $regex: escapeRegex(term), $options: "i" };
          }
        }

        let projection: Record<string, unknown> | undefined;
        let sortCriteria: Record<string, | SortOrder | { $meta: "textScore"; }>;
        if (useTextSearch && safeSortBy === "relevance") {
          projection = { score: { $meta: "textScore" } };
          sortCriteria = { score: { $meta: "textScore" } };
        } else {
          sortCriteria = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };
          if (safeSortBy !== "createdAt") { sortCriteria.createdAt = -1; }
        }

        const [data, total] = await Promise.all([
          Service.find(matchQuery, projection)
            .populate({
              path: "subServiceComponents", match: { isActive: true },
              select: "name description image isActive",
            })
            .select({ name: 1, shortDescription: 1, thumbnailImage: 1, categoryId: 1, isActive: 1, serviceReference: 1, createdAt: 1, isComplete: 1, startingPrice: 1, locations: 1, tiers: 1 })
            .sort(sortCriteria).skip(skip).limit(safeLimit).lean({ virtuals: true }),

          Service.countDocuments(matchQuery),
        ]);

        return {
          data, total, page: safePage, totalPages: Math.ceil(total / safeLimit),
        };
      },
    });
  }

  static async updateServiceLocations(serviceId: string, locations: { locationId: string; }[]) {
    const service = await Service.findById(serviceId);
    if (!service) { throw createHttpError("Service not found", 404); }

    const uniqueIds = [...new Set(locations.map((location) => location.locationId))];
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const validLocations = await Location.find({ _id: { $in: objectIds }, isActive: true }).select("_id name").lean();
    if (validLocations.length !== objectIds.length) { throw createHttpError("One or more locations are invalid or inactive", 400); }

    const formattedLocations = validLocations.map((location) => ({ locationId: location._id, name: location.name, isActive: true }));
    service.locations = formattedLocations;
    await service.save();
    await ServiceCascadingEngine.run(serviceId);
    await this.invalidateServiceCache(serviceId);

    return {
      success: true,
      message: "Service locations updated successfully",
      locations: formattedLocations,
    };
  }

  static async removeServiceLocation(serviceId: string, locationId: string) {
    const service = await Service.findById(serviceId);
    if (!service) { throw createHttpError("Service not found", 404); }

    const exists = service.locations.some((location) => location.locationId.toString() === locationId);

    if (!exists) {
      return { success: true, unchanged: true, message: "Location already not present", locations: service.locations };
    }

    service.locations = service.locations.filter((location) => location.locationId.toString() !== locationId);
    await service.save();
    await ServiceCascadingEngine.run(serviceId);
    await this.invalidateServiceCache(serviceId);

    return {
      success: true,
      message: "Location removed successfully",
      locations: service.locations,
    };
  }

  static async updateServiceTiers(serviceId: string, tiers: { tierId: string; }[]) {
    const service = await Service.findById(serviceId);
    if (!service) { throw createHttpError("Service not found", 404); }

    const uniqueIds = [...new Set(tiers.map((tier) => tier.tierId))];
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const validTiers = await Tier.find({ _id: { $in: objectIds }, isActive: true }).select("_id name").lean();
    if (validTiers.length !== objectIds.length) {
      throw createHttpError("One or more tiers are invalid or inactive", 400);
    }

    const currentIds = service.tiers.map((tier) => tier.tierId.toString());
    const newIds = objectIds.map((id) => id.toString());
    const isSame = currentIds.length === newIds.length && currentIds.every((id) => newIds.includes(id));
    if (isSame) {
      return { success: true, unchanged: true, message: "No changes in tiers", tiers: service.tiers };
    }

    service.tiers = validTiers.map((tier) => ({ tierId: tier._id, name: tier.name }));
    await service.save();
    await ServiceCascadingEngine.run(serviceId);
    await this.invalidateServiceCache(serviceId);

    return {
      success: true,
      message: "Service tiers updated successfully",
      tiers: service.tiers,
    };
  }

  static async removeServiceTier(serviceId: string, tierId: string) {
    const service = await Service.findById(serviceId);
    if (!service) { throw createHttpError("Service not found", 404); }
    const exists = service.tiers.some((tier) => tier.tierId.toString() === tierId);
    if (!exists) {
      return { success: true, unchanged: true, message: "Tier already not present", tiers: service.tiers };
    }

    service.tiers = service.tiers.filter((tier) => tier.tierId.toString() !== tierId);
    await service.save();
    await ServiceCascadingEngine.run(serviceId);
    await this.invalidateServiceCache(serviceId);

    return {
      success: true,
      message: "Tier removed successfully",
      tiers: service.tiers,
    };
  }

  static async getFullService(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) { throw createHttpError("Invalid serviceId", 400); }

    return RedisCacheService.getOrSet({
      key: CacheKeys.serviceFull(serviceId),
      ttlSeconds: CACHE_TTL_SECONDS.SERVICE_FULL,
      loader: async () => {
        // PUBLIC endpoint. Only active + complete Service.
        const service = await Service.findOne({ _id: new Types.ObjectId(serviceId), isActive: true, isComplete: true })
          .populate({
            path: "subServiceComponents", match: { isActive: true },
            select: "name description image isActive",
            options: { sort: { createdAt: -1 } },
          }).lean({ virtuals: true });

        if (!service) { throw createHttpError("Service not available", 404); }
        return this.buildFullServiceData(service, { publicView: true },
        );
      },
    });
  }

  static async getFullServiceAdmin(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) { throw createHttpError("Invalid serviceId", 400); }

    // Admin version intentionally does NOT use the public serviceFull cache.
    const service = await Service.findById(serviceId)
      .populate({
        path: "subServiceComponents",
        // No isActive filter. Admin should be able to inspect inactive sub-services as configuration data.
        select: "name description image isActive",
        options: { sort: { createdAt: -1 } },
      }).lean({ virtuals: true });

    if (!service) { throw createHttpError("Service not found", 404); }
    return this.buildFullServiceData(service, { publicView: false },
    );
  }

  static async getFullServiceByCities(serviceId: string, cityIds: string[]) {
    const cacheKey = CacheKeys.serviceFullByCities(serviceId, cityIds);

    return RedisCacheService.getOrSet({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS.SERVICE_FULL_BY_CITIES,
      loader: async () => {
        // Get only active locations belonging to the requested cities.
        const locations = await Location.find({ cityId: { $in: cityIds.map((id) => new Types.ObjectId(id)) }, isActive: true })
          .populate({ path: "cityId", select: "name" })
          .select("_id name cityId").lean();

        const locationIds = locations.map((location) => location._id);
        const locationMap = new Map(locations.map((location: any) => [location._id.toString(), { locationId: location._id, locationName: location.name, city: location.cityId }]));

        // Fetch the service.
        const service = await Service.findById(serviceId)
          .populate({
            path: "subServiceComponents",
            match: { isActive: true },
            select: "name description image isActive",
            options: { sort: { createdAt: -1 } },
          }).lean({ virtuals: true });

        if (!service) {
          throw createHttpError("Service not found", 404);
        }

        // Public full-service response must never expose inactive or incomplete services.
        if (!service.isActive || !service.isComplete) { throw createHttpError("Service not available", 404); }

        // Find globally active tiers that are currently attached to this service.
        const serviceTierIds = service.tiers.map((tier) => tier.tierId);
        const activeTierDocs = await Tier.find({ _id: { $in: serviceTierIds }, isActive: true }).select("_id").lean();
        const activeTierIds = activeTierDocs.map((tier) => tier._id);
        const activeTierIdSet = new Set(activeTierDocs.map((tier) => tier._id.toString()));

        // Keep only service locations that correspond to active locations from the requested cities.
        const filteredLocations = service.locations
          .filter((location) => location.isActive && locationIds.some((id) => id.toString() === location.locationId.toString()))
          .map((location) => ({ ...location, locationDetails: locationMap.get(location.locationId.toString()) ?? null }));

        // Load service configuration, active pricing and active components.
        const [components, pricing, componentDetails] = await Promise.all([
          ServiceComponent.find({ serviceId, tierId: { $in: activeTierIds } }).lean(),
          ServicePricing.find({ serviceId, locationId: { $in: locationIds }, tierId: { $in: activeTierIds }, isActive: true }).lean(),
          Component.find({ isActive: true }).select("name imageUrl isRemovable isBundled isActive").lean(),
        ]);

        // Collect all component-item IDs used by the selected service components.
        const itemIds = components.flatMap((component) => component.items?.map((item) => item.itemId) ?? []);

        // Only active component items should be exposed publicly.
        const itemDocs = await ComponentItem.find({ _id: { $in: itemIds }, isActive: true }).lean();
        const itemMap = new Map(itemDocs.map((item) => [item._id.toString(), item]));

        // Active Component lookup.
        const componentMap = new Map(componentDetails.map((component) => [component._id.toString(), { id: component._id, imageUrl: component.imageUrl ?? null, name: component.name, isRemovable: component.isRemovable, isBundled: component.isBundled, isActive: component.isActive }]));

        // Group active pricing by tier + component.
        const pricingMap = new Map<string, any[]>();

        for (const price of pricing) {
          const key = `${price.tierId.toString()}_${price.componentId.toString()}`;
          const existing = pricingMap.get(key) ?? [];
          existing.push({ locationId: price.locationId, locationDetails: locationMap.get(price.locationId.toString()) ?? null, price: price.price });
          pricingMap.set(key, existing);
        }

        // Build response grouped by tier.
        const grouped: Record<string, any> = {};

        for (const component of components) {
          const tierId = component.tierId.toString();

          // Defensive check. Never expose inactive tiers.
          if (!activeTierIdSet.has(tierId)) { continue; }
          const componentInfo = componentMap.get(component.componentId.toString());

          // Component is inactive or missing.
          if (!componentInfo) { continue; }
          const pricingKey = `${component.tierId.toString()}_${component.componentId.toString()}`;
          const componentPricing = pricingMap.get(pricingKey) ?? [];

          // If there is no active pricing for this component in the requested locations, don't expose it.
          if (componentPricing.length === 0) { continue; }

          // Remove inactive component items while keeping details for active ones.
          const activeItems = (component.items ?? [])
            .filter((item) => itemMap.has(item.itemId.toString()))
            .map((item) => ({ ...item, itemDetails: itemMap.get(item.itemId.toString()) }),
            );

          if (!grouped[tierId]) {
            grouped[tierId] = { tierId: component.tierId, components: [] };
          }

          grouped[tierId].components.push({
            componentId: component.componentId,
            name: component.name,
            description: component.description,
            isRequired: component.isRequired,
            component: {
              id: componentInfo.id,
              image: componentInfo.imageUrl,
              isRemovable: componentInfo.isRemovable,
              isBundled: componentInfo.isBundled,
              isActive: componentInfo.isActive,
            },
            items: activeItems,
            pricing: componentPricing,
          });
        }

        // Return only active tiers that actually contain usable components/pricing.
        const filteredTiers = service.tiers.filter((tier) => { const tierId = tier.tierId.toString(); return (activeTierIdSet.has(tierId) && Boolean(grouped[tierId])); });

        return {
          service: {
            id: service._id,
            name: service.name,
            shortDescription: service.shortDescription,
            fullDescription: service.fullDescription,
            thumbnailImage: service.thumbnailImage,
            bannerImage: service.bannerImage,
            startingPrice: service.startingPrice,
            isActive: service.isActive,
            isComplete: service.isComplete,
            serviceReference: service.serviceReference,
          },
          subServiceComponents: service.subServiceComponents ?? [],
          locations: filteredLocations,
          tiers: filteredTiers.map((tier) => ({ tierId: tier.tierId, name: tier.name })),
          components: grouped,
        };
      },
    });
  }

  static async updateServiceStartingPrice(serviceId: string) {
    const components = await ServiceComponent.find({ serviceId, isRequired: true }).lean();
    if (!components.length) {
      await Service.findByIdAndUpdate(serviceId, { $set: { startingPrice: 0 } });
      await this.invalidateServiceCache(serviceId);
      return;
    }

    const tierComponentMap = new Map<string, string[]>();

    for (const component of components) {
      const tierId = component.tierId.toString();
      const existing = tierComponentMap.get(tierId) ?? [];
      existing.push(component.componentId.toString());
      tierComponentMap.set(tierId, existing);
    }

    const pricing = await ServicePricing.find({ serviceId, isActive: true }).lean();
    const pricingMap = new Map<string, number>();

    for (const price of pricing) {
      const key = `${price.tierId}_${price.locationId}_${price.componentId}`;
      pricingMap.set(key, price.price);
    }

    let minimumPrice = Infinity;

    for (const [tierId, componentIds] of tierComponentMap.entries()) {
      const locationIds = [...new Set(pricing.filter((price) => price.tierId.toString() === tierId).map((price) => price.locationId.toString()))];

      for (const locationId of locationIds) {
        let total = 0;
        let valid = true;

        for (const componentId of componentIds) {
          const key = `${tierId}_${locationId}_${componentId}`;
          const price = pricingMap.get(key);

          if (price === undefined) {
            valid = false;
            break;
          }
          total += price;
        }

        if (valid) { minimumPrice = Math.min(minimumPrice, total); }
      }
    }

    await Service.findByIdAndUpdate(serviceId, { $set: { startingPrice: minimumPrice === Infinity ? 0 : minimumPrice } });
    await this.invalidateServiceCache(serviceId);
  }

  static async validateServiceConfiguration(serviceId: string) {
    const evaluation = await ServiceCascadingEngine.evaluateConfiguration(serviceId);

    // Persist the derived completeness state, but never automatically activate. If configuration has become invalid, force the service off.
    const update: Record<string, unknown> = { isComplete: evaluation.isComplete };
    if (!evaluation.isComplete) {
      update.isActive = false;
      update.startingPrice = 0;
    }

    const updated = await Service.findByIdAndUpdate(serviceId, { $set: update }, { new: true, runValidators: true }).lean();
    if (!updated) { throw createHttpError("Service not found", 404); }
    await this.invalidateServiceCache(serviceId);

    return { isComplete: evaluation.isComplete, issues: evaluation.issues };
  }

  static async exportServicesToCsv(serviceIds: string[]) {
    const uniqueServiceIds = [...new Set(serviceIds)];

    const services = await Service.find({ _id: { $in: uniqueServiceIds } })
      .select(["serviceReference", "name", "shortDescription", "categoryId", "locations", "tiers", "startingPrice", "isActive", "isComplete", "createdAt", "updatedAt"].join(" "))
      .populate({ path: "categoryId", select: "label value" })
      .lean();

    if (services.length === 0) { throw createHttpError("No services found for export", 404); }

    // Preserve the order supplied by the admin/frontend.
    const serviceMap = new Map(services.map((service) => [service._id.toString(), service]));
    const orderedServices = uniqueServiceIds.map((id) => serviceMap.get(id)).filter((service): service is NonNullable<typeof service> => Boolean(service));
    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '""';
      }

      let text = String(value);

      // Prevent CSV / spreadsheet formula injection when opened in Excel.
      if (/^[=+\-@]/.test(text)) { text = `'${text}`; }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const formatDate = (value: unknown): string => {
      if (!value) { return ""; }
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    };

    const headers = ["Service Reference", "Service Name", "Category", "Short Description", "Starting Price", "Commission Percentage", "Locations", "Location Count", "Tiers", "Tier Count", "Active", "Configuration Complete", "Created At", "Updated At"];

    const rows = orderedServices.map((service) => {
      const category = service.categoryId as { label?: string; value?: string; } | null | undefined;
      const locations = service.locations ?? [];
      const tiers = service.tiers ?? [];
      const locationNames = locations.map((location) => location.name).filter(Boolean).join(" | ");
      const tierNames = tiers.map((tier) => tier.name).filter(Boolean).join(" | ");

      return [service.serviceReference, service.name, category?.label ?? category?.value ?? "", service.shortDescription, service.startingPrice, service.commissionPercentage, locationNames, locations.length, tierNames, tiers.length, service.isActive ? "Yes" : "No", service.isComplete ? "Yes" : "No", formatDate(service.createdAt), formatDate(service.updatedAt)];
    },
    );

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\r\n");

    return { csv, total: orderedServices.length };
  }
}