import mongoose, { Types, } from "mongoose";
import { Service, } from "../models/service.model.js";
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
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export class ServiceService {
    static async createService(payload) {
        const name = payload.name.trim();
        const shortDescription = payload.shortDescription.trim();
        const fullDescription = payload.fullDescription.trim();
        const categoryId = payload.categoryId;
        const thumbnailImage = payload.thumbnailImage.trim();
        const categoryExists = await Category.exists({
            _id: categoryId,
        });
        if (!categoryExists) {
            throw createHttpError("Category not found", 404);
        }
        const slug = generateSlug(name);
        const sequence = await getNextSequence(`service_${slug}`);
        const serviceReference = `${slug}_${String(sequence).padStart(4, "0")}`;
        return Service.create({
            name,
            shortDescription,
            fullDescription,
            categoryId,
            thumbnailImage,
            locations: [],
            tiers: [],
            serviceReference,
            isActive: false,
            isComplete: false,
            startingPrice: 0,
            ...(payload.bannerImage !== undefined && {
                bannerImage: payload.bannerImage,
            }),
        });
    }
    static async updateService(serviceId, payload) {
        const updateData = {};
        if (payload.name !== undefined) {
            updateData.name = payload.name.trim();
        }
        if (payload.shortDescription !== undefined) {
            updateData.shortDescription =
                payload.shortDescription.trim();
        }
        if (payload.fullDescription !== undefined) {
            updateData.fullDescription =
                payload.fullDescription.trim();
        }
        if (payload.thumbnailImage !== undefined) {
            updateData.thumbnailImage =
                payload.thumbnailImage;
        }
        if (payload.bannerImage !== undefined) {
            updateData.bannerImage =
                payload.bannerImage;
        }
        if (payload.categoryId !== undefined) {
            const categoryExists = await Category.exists({
                _id: payload.categoryId,
            });
            if (!categoryExists) {
                throw createHttpError("Category not found", 404);
            }
            updateData.categoryId =
                payload.categoryId;
        }
        const updatedService = await Service.findByIdAndUpdate(serviceId, {
            $set: updateData,
        }, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedService) {
            throw createHttpError("Service not found", 404);
        }
        return updatedService;
    }
    static async getServiceById(serviceId) {
        const service = await Service.findById(serviceId).lean();
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        return service;
    }
    static async getDeactivationImpact(serviceId) {
        const serviceObjectId = new Types.ObjectId(serviceId);
        const [packageMappings, packagePricing, servicePricing,] = await Promise.all([
            PackageTierMap.find({
                services: {
                    $elemMatch: {
                        serviceId: serviceObjectId,
                    },
                },
            }, {
                _id: 1,
                packageId: 1,
                tierId: 1,
            }).lean(),
            PackageTierPricing.find({
                serviceId: serviceObjectId,
            }, {
                _id: 1,
            }).lean(),
            ServicePricing.find({
                serviceId: serviceObjectId,
            }, {
                _id: 1,
            }).lean(),
        ]);
        return {
            packageUsageCount: packageMappings.length,
            packagePricingCount: packagePricing.length,
            servicePricingCount: servicePricing.length,
            packageMappings,
            packagePricing,
            servicePricing,
        };
    }
    static async toggleServiceStatus(serviceId, isActive, confirmed = false) {
        const service = await Service.findById(serviceId)
            .select("_id isActive")
            .lean();
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        if (service.isActive === isActive) {
            return {
                success: true,
                unchanged: true,
                service,
            };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(serviceId);
            if (impact.packageUsageCount > 0 ||
                impact.packagePricingCount > 0 ||
                impact.servicePricingCount > 0) {
                return {
                    requiresConfirmation: true,
                    impact,
                };
            }
        }
        if (isActive) {
            const validation = await this.validateServiceConfiguration(serviceId);
            if (!validation.isComplete) {
                throw createHttpError("Service configuration incomplete. Cannot activate.", 400);
            }
        }
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const updatedService = await Service.findByIdAndUpdate(serviceId, {
                $set: {
                    isActive,
                },
            }, {
                new: true,
                session,
            }).lean();
            if (!updatedService) {
                throw createHttpError("Service not found", 404);
            }
            if (!isActive) {
                await Promise.all([
                    ServicePricing.updateMany({
                        serviceId: new Types.ObjectId(serviceId),
                        isActive: true,
                    }, {
                        $set: {
                            isActive: false,
                        },
                    }, {
                        session,
                    }),
                    PackageTierPricing.updateMany({
                        serviceId: new Types.ObjectId(serviceId),
                        isActive: true,
                    }, {
                        $set: {
                            isActive: false,
                        },
                    }, {
                        session,
                    }),
                ]);
            }
            await session.commitTransaction();
            if (isActive) {
                await ServiceCascadingEngine.run(serviceId);
            }
            return {
                success: true,
                service: updatedService,
            };
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getServicesByLocation(params) {
        const { cityIds, categoryIds, limit = 20, page = 1, isActive, isComplete, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = (safePage - 1) * safeLimit;
        const matchQuery = {};
        if (cityIds?.length) {
            const locations = await Location.find({
                cityId: {
                    $in: cityIds.map((id) => new Types.ObjectId(id)),
                },
                isActive: true,
            })
                .select("_id")
                .lean();
            matchQuery["locations.locationId"] = {
                $in: locations.map((location) => location._id),
            };
        }
        if (typeof isActive === "boolean") {
            matchQuery.isActive = isActive;
        }
        if (typeof isComplete === "boolean") {
            matchQuery.isComplete = isComplete;
        }
        if (categoryIds?.length) {
            matchQuery.categoryId = {
                $in: categoryIds.map((id) => new Types.ObjectId(id)),
            };
        }
        const allowedSortFields = new Set([
            "name",
            "createdAt",
            "updatedAt",
            "startingPrice",
            "isActive",
            "isComplete",
        ]);
        const safeSortBy = allowedSortFields.has(sortBy)
            ? sortBy
            : "createdAt";
        const sortCriteria = {
            [safeSortBy]: sortOrder === "asc" ? 1 : -1,
        };
        const [services, total] = await Promise.all([
            Service.find(matchQuery)
                .populate({
                path: "subServiceComponents",
                match: {
                    isActive: true,
                },
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
                startingPrice: 1,
                locations: 1,
                tiers: 1,
            })
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean({
                virtuals: true,
            }),
            Service.countDocuments(matchQuery),
        ]);
        return {
            data: services,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async findServices(params) {
        const { searchTerm, categoryId, locationId, limit = 20, page = 1, isActive, isComplete, sortBy = "createdAt", sortOrder = "desc", } = params;
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const skip = (safePage - 1) * safeLimit;
        const matchQuery = {};
        if (typeof isActive === "boolean") {
            matchQuery.isActive = isActive;
        }
        if (typeof isComplete === "boolean") {
            matchQuery.isComplete = isComplete;
        }
        if (categoryId) {
            matchQuery.categoryId =
                new Types.ObjectId(categoryId);
        }
        if (locationId) {
            matchQuery["locations.locationId"] =
                new Types.ObjectId(locationId);
        }
        const term = searchTerm?.trim();
        const useTextSearch = Boolean(term && term.length > 4);
        if (term) {
            if (useTextSearch) {
                matchQuery.$text = {
                    $search: term,
                };
            }
            else {
                matchQuery.name = {
                    $regex: escapeRegex(term),
                    $options: "i",
                };
            }
        }
        let projection;
        let sortCriteria;
        if (useTextSearch &&
            sortBy === "relevance") {
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
            const allowedSortFields = new Set([
                "name",
                "createdAt",
                "updatedAt",
                "startingPrice",
                "isActive",
                "isComplete",
            ]);
            const safeSortBy = allowedSortFields.has(sortBy)
                ? sortBy
                : "createdAt";
            sortCriteria = {
                [safeSortBy]: sortOrder === "asc" ? 1 : -1,
            };
            if (safeSortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        const [data, total] = await Promise.all([
            Service.find(matchQuery, projection)
                .populate({
                path: "subServiceComponents",
                match: {
                    isActive: true,
                },
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
                startingPrice: 1,
                locations: 1,
                tiers: 1,
            })
                .sort(sortCriteria)
                .skip(skip)
                .limit(safeLimit)
                .lean({
                virtuals: true,
            }),
            Service.countDocuments(matchQuery),
        ]);
        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    static async updateServiceLocations(serviceId, locations) {
        const service = await Service.findById(serviceId);
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const uniqueIds = [
            ...new Set(locations.map((location) => location.locationId)),
        ];
        const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
        const validLocations = await Location.find({
            _id: {
                $in: objectIds,
            },
        })
            .select("_id name")
            .lean();
        if (validLocations.length !==
            objectIds.length) {
            throw createHttpError("One or more location IDs are invalid", 400);
        }
        const formattedLocations = validLocations.map((location) => ({
            locationId: location._id,
            name: location.name,
            isActive: true,
        }));
        service.locations =
            formattedLocations;
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Service locations updated successfully",
            locations: formattedLocations,
        };
    }
    static async removeServiceLocation(serviceId, locationId) {
        const service = await Service.findById(serviceId);
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const exists = service.locations.some((location) => location.locationId.toString() ===
            locationId);
        if (!exists) {
            return {
                success: true,
                unchanged: true,
                message: "Location already not present",
                locations: service.locations,
            };
        }
        service.locations =
            service.locations.filter((location) => location.locationId.toString() !==
                locationId);
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Location removed successfully",
            locations: service.locations,
        };
    }
    static async updateServiceTiers(serviceId, tiers) {
        const service = await Service.findById(serviceId);
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const uniqueIds = [
            ...new Set(tiers.map((tier) => tier.tierId)),
        ];
        const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
        const validTiers = await Tier.find({
            _id: {
                $in: objectIds,
            },
        })
            .select("_id name")
            .lean();
        if (validTiers.length !==
            objectIds.length) {
            throw createHttpError("One or more tier IDs are invalid", 400);
        }
        const currentIds = service.tiers.map((tier) => tier.tierId.toString());
        const newIds = objectIds.map((id) => id.toString());
        const isSame = currentIds.length ===
            newIds.length &&
            currentIds.every((id) => newIds.includes(id));
        if (isSame) {
            return {
                success: true,
                unchanged: true,
                message: "No changes in tiers",
                tiers: service.tiers,
            };
        }
        service.tiers =
            validTiers.map((tier) => ({
                tierId: tier._id,
                name: tier.name,
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
        const service = await Service.findById(serviceId);
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const exists = service.tiers.some((tier) => tier.tierId.toString() ===
            tierId);
        if (!exists) {
            return {
                success: true,
                unchanged: true,
                message: "Tier already not present",
                tiers: service.tiers,
            };
        }
        service.tiers =
            service.tiers.filter((tier) => tier.tierId.toString() !==
                tierId);
        await service.save();
        await ServiceCascadingEngine.run(serviceId);
        return {
            success: true,
            message: "Tier removed successfully",
            tiers: service.tiers,
        };
    }
    static async getFullService(serviceId) {
        const service = await Service.findById(serviceId)
            .populate({
            path: "subServiceComponents",
            match: {
                isActive: true,
            },
            select: "name description image isActive",
            options: {
                sort: {
                    createdAt: -1,
                },
            },
        })
            .lean({
            virtuals: true,
        });
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const [serviceComponents, pricing, serviceCategory,] = await Promise.all([
            ServiceComponent.find({
                serviceId,
            }).lean(),
            ServicePricing.find({
                serviceId,
            })
                .select([
                "tierId",
                "componentId",
                "locationId",
                "price",
                "taxProfileId",
                "taxPriceMode",
                "isActive",
            ].join(" "))
                .populate({
                path: "taxProfileId",
                match: {
                    isActive: true,
                },
                select: "name code treatment totalRate isActive",
            })
                .lean(),
            Category.findById(service.categoryId)
                .select("label value image")
                .lean(),
        ]);
        const componentIds = serviceComponents.map((component) => component.componentId);
        const componentDocs = await Component.find({
            _id: {
                $in: componentIds,
            },
        }).lean();
        const componentMap = new Map(componentDocs.map((component) => [
            component._id.toString(),
            component,
        ]));
        const itemIds = serviceComponents.flatMap((component) => component.items?.map((item) => item.itemId) ?? []);
        const itemDocs = await ComponentItem.find({
            _id: {
                $in: itemIds,
            },
        }).lean();
        const itemMap = new Map(itemDocs.map((item) => [
            item._id.toString(),
            item,
        ]));
        const pricingMap = new Map();
        for (const price of pricing) {
            const key = `${price.tierId.toString()}_${price.componentId.toString()}`;
            const existing = pricingMap.get(key) ?? [];
            const taxProfile = price.taxProfileId;
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
                    priceMode: taxProfile
                        ? price.taxPriceMode ??
                            "EXCLUSIVE"
                        : "EXCLUSIVE",
                    isTaxConfigured: Boolean(taxProfile),
                },
            });
            pricingMap.set(key, existing);
        }
        const grouped = {};
        for (const component of serviceComponents) {
            const tierId = component.tierId.toString();
            if (!grouped[tierId]) {
                grouped[tierId] = {
                    tierId: component.tierId,
                    components: [],
                };
            }
            const pricingKey = `${component.tierId.toString()}_${component.componentId.toString()}`;
            const componentDetails = componentMap.get(component.componentId.toString());
            grouped[tierId].components.push({
                componentId: component.componentId,
                name: component.name,
                description: component.description,
                isRequired: component.isRequired,
                component: componentDetails
                    ? {
                        id: componentDetails._id,
                        image: componentDetails.imageUrl,
                        isRemovable: componentDetails.isRemovable,
                        isBundled: componentDetails.isBundled,
                        isActive: componentDetails.isActive,
                    }
                    : null,
                items: (component.items ?? []).map((item) => ({
                    ...item,
                    itemDetails: itemMap.get(item.itemId.toString()) ?? null,
                })),
                pricing: pricingMap.get(pricingKey) ?? [],
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
                startingPrice: service.startingPrice,
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
            subServiceComponents: service.subServiceComponents ?? [],
            locations: service.locations,
            tiers: service.tiers.map((tier) => ({
                tierId: tier.tierId,
                name: tier.name,
            })),
            components: grouped,
        };
    }
    static async getFullServiceByCities(serviceId, cityIds) {
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
        const locationIds = locations.map((location) => location._id);
        const locationMap = new Map(locations.map((location) => [
            location._id.toString(),
            {
                locationId: location._id,
                locationName: location.name,
                city: location.cityId,
            },
        ]));
        const service = await Service.findById(serviceId)
            .populate({
            path: "subServiceComponents",
            match: {
                isActive: true,
            },
            select: "name description image isActive",
            options: {
                sort: {
                    createdAt: -1,
                },
            },
        })
            .lean({
            virtuals: true,
        });
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const filteredLocations = service.locations
            .filter((location) => locationIds.some((id) => id.toString() ===
            location.locationId.toString()))
            .map((location) => ({
            ...location,
            locationDetails: locationMap.get(location.locationId.toString()) ?? null,
        }));
        const [components, pricing, componentDetails,] = await Promise.all([
            ServiceComponent.find({
                serviceId,
            }).lean(),
            ServicePricing.find({
                serviceId,
                locationId: {
                    $in: locationIds,
                },
            }).lean(),
            Component.find({
                isActive: true,
            })
                .select("name imageUrl")
                .lean(),
        ]);
        const componentMap = new Map(componentDetails.map((component) => [
            component._id.toString(),
            {
                imageUrl: component.imageUrl ?? null,
                name: component.name,
            },
        ]));
        const pricingMap = new Map();
        for (const price of pricing) {
            const key = `${price.tierId}_${price.componentId}`;
            const existing = pricingMap.get(key) ?? [];
            existing.push({
                locationId: price.locationId,
                locationDetails: locationMap.get(price.locationId.toString()) ?? null,
                price: price.price,
            });
            pricingMap.set(key, existing);
        }
        const grouped = {};
        for (const component of components) {
            const tierId = component.tierId.toString();
            const pricingKey = `${component.tierId}_${component.componentId}`;
            const componentPricing = pricingMap.get(pricingKey) ?? [];
            if (componentPricing.length === 0) {
                continue;
            }
            if (!grouped[tierId]) {
                grouped[tierId] = {
                    tierId: component.tierId,
                    components: [],
                };
            }
            const componentInfo = componentMap.get(component.componentId.toString());
            grouped[tierId].components.push({
                componentId: component.componentId,
                name: component.name,
                description: component.description,
                isRequired: component.isRequired,
                imageUrl: componentInfo?.imageUrl ??
                    null,
                items: component.items ?? [],
                pricing: componentPricing,
            });
        }
        const filteredTiers = service.tiers.filter((tier) => grouped[tier.tierId.toString()]);
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
            tiers: filteredTiers.map((tier) => ({
                tierId: tier.tierId,
                name: tier.name,
            })),
            components: grouped,
        };
    }
    static async updateServiceStartingPrice(serviceId) {
        const components = await ServiceComponent.find({
            serviceId,
            isRequired: true,
        }).lean();
        if (!components.length) {
            await Service.findByIdAndUpdate(serviceId, {
                $set: {
                    startingPrice: 0,
                },
            });
            return;
        }
        const tierComponentMap = new Map();
        for (const component of components) {
            const tierId = component.tierId.toString();
            const existing = tierComponentMap.get(tierId) ?? [];
            existing.push(component.componentId.toString());
            tierComponentMap.set(tierId, existing);
        }
        const pricing = await ServicePricing.find({
            serviceId,
            isActive: true,
        }).lean();
        const pricingMap = new Map();
        for (const price of pricing) {
            const key = `${price.tierId}_${price.locationId}_${price.componentId}`;
            pricingMap.set(key, price.price);
        }
        let minimumPrice = Infinity;
        for (const [tierId, componentIds,] of tierComponentMap.entries()) {
            const locationIds = [
                ...new Set(pricing
                    .filter((price) => price.tierId.toString() ===
                    tierId)
                    .map((price) => price.locationId.toString())),
            ];
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
                if (valid) {
                    minimumPrice = Math.min(minimumPrice, total);
                }
            }
        }
        await Service.findByIdAndUpdate(serviceId, {
            $set: {
                startingPrice: minimumPrice === Infinity
                    ? 0
                    : minimumPrice,
            },
        });
    }
    static async validateServiceConfiguration(serviceId) {
        const service = await Service.findById(serviceId).lean();
        if (!service) {
            throw createHttpError("Service not found", 404);
        }
        const issues = [];
        const activeLocations = service.locations.filter((location) => location.isActive);
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
            isActive: true,
        }).lean();
        const pricingMap = new Set(pricing.map((price) => `${price.tierId}_${price.locationId}_${price.componentId}`));
        const tierComponentMap = new Map();
        for (const component of requiredComponents) {
            const tierId = component.tierId.toString();
            const existing = tierComponentMap.get(tierId) ?? [];
            existing.push(component);
            tierComponentMap.set(tierId, existing);
        }
        let hasValidCombination = false;
        for (const [tierId, tierComponents,] of tierComponentMap.entries()) {
            for (const location of activeLocations) {
                const allPriced = tierComponents.every((component) => {
                    const key = `${tierId}_${location.locationId}_${component.componentId}`;
                    return pricingMap.has(key);
                });
                if (allPriced) {
                    hasValidCombination = true;
                    break;
                }
            }
            if (hasValidCombination) {
                break;
            }
        }
        if (!hasValidCombination) {
            issues.push("No fully priced tier/location combination exists");
        }
        const isComplete = issues.length === 0;
        await Service.findByIdAndUpdate(serviceId, {
            $set: {
                isComplete,
            },
        });
        return {
            isComplete,
            issues,
        };
    }
}
//# sourceMappingURL=service.service.js.map