import { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
import { PricingService } from "./pricing.service.js";
export class PackageService {
    static extractVariantIds(service) {
        const ids = [];
        return ids;
    }
    static async validateServices(serviceIds) {
        if (!serviceIds || serviceIds.length === 0) {
            throw new Error("At least one service is required");
        }
        const uniqueIds = [...new Set(serviceIds)];
        const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
        const services = await Service.find({
            _id: { $in: objectIds },
        });
        if (services.length !== objectIds.length) {
            throw new Error("One or more services are invalid");
        }
        const inactive = services.find((s) => !s.isActive);
        if (inactive) {
            throw new Error(`Service ${inactive.name} is inactive`);
        }
        return services;
    }
    static async createPackage(payload) {
        const { name, description, image, services, locations, pricing, category, createdBy, } = payload;
        const serviceIds = services.map((s) => s.serviceId);
        const validatedServices = await this.validateServices(serviceIds);
        const servicePayload = validatedServices.map((s, index) => ({
            serviceId: s._id,
            displayOrder: index,
        }));
        const finalPricing = {
            type: pricing?.type || "DERIVED",
            discountPercentage: pricing?.discountPercentage || 0,
            ...(pricing?.fixedPrice !== undefined && {
                fixedPrice: pricing.fixedPrice,
            }),
        };
        const pkg = await Package.create({
            name,
            services: servicePayload,
            pricing: finalPricing,
            ...(image !== undefined && { image }),
            ...(description !== undefined && { description }),
            ...(locations !== undefined && { locations }),
            ...(createdBy !== undefined && { createdBy }),
        });
        return pkg;
    }
    static async updatePackage(packageId, updateData) {
        const existing = await Package.findById(packageId);
        if (!existing || !existing.isActive) {
            throw new Error("Package not found");
        }
        let shouldIncrementVersion = false;
        let updatedServices = existing.services;
        if (updateData.services) {
            const incomingServiceIds = updateData.services.map((s) => typeof s === "string" ? s : s.serviceId);
            const validated = await this.validateServices(incomingServiceIds);
            const newServiceIds = validated.map((s) => s._id.toString()).sort();
            const oldServiceIds = existing.services
                .map((s) => s.serviceId.toString())
                .sort();
        }
        if (updateData.locations) {
            const newLoc = [...updateData.locations].sort();
            const oldLoc = [...(existing.locations || [])].sort();
            if (JSON.stringify(newLoc) !== JSON.stringify(oldLoc)) {
                shouldIncrementVersion = true;
            }
        }
        if (updateData.pricing) {
            const oldPricing = existing.pricing;
            if (updateData.pricing.type !== oldPricing.type ||
                updateData.pricing.fixedPrice !== oldPricing.fixedPrice ||
                updateData.pricing.discountPercentage !== oldPricing.discountPercentage) {
                shouldIncrementVersion = true;
            }
        }
        if (updateData.name && updateData.name !== existing.name) {
            shouldIncrementVersion = true;
        }
        if (updateData.description &&
            updateData.description !== existing.description) {
            shouldIncrementVersion = true;
        }
        const updatePayload = {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description && { description: updateData.description }),
            ...(updateData.image && { image: updateData.image }),
            ...(updateData.locations && { locations: updateData.locations }),
            ...(updateData.pricing && { pricing: updateData.pricing }),
            category: updateData.category,
            ...(updateData.isActive !== undefined && {
                isActive: updateData.isActive,
            }),
            ...(updateData.displayOrder !== undefined && {
                displayOrder: updateData.displayOrder,
            }),
            ...(updateData.services && { services: updatedServices }),
        };
        if (shouldIncrementVersion) {
            updatePayload.version = existing.version + 1;
        }
        const updated = await Package.findByIdAndUpdate(packageId, { $set: updatePayload }, { new: true, runValidators: true });
        return updated;
    }
    static async getPackageDetails(packageId, location) {
        const pkg = await Package.findOne({
            _id: packageId,
            isActive: true,
        }).lean();
        if (!pkg)
            throw new Error("Package not found");
        const serviceIds = pkg.services.map((s) => s.serviceId);
        const services = await Service.find({
            _id: { $in: serviceIds },
            isActive: true,
        })
            .populate({
            path: "subServices.variants.variantId",
            model: "Component",
        })
            .lean();
        return {
            ...pkg,
            services: [],
        };
    }
    static async updatePackageStatus(packageId, isActive) {
        const pkg = await Package.findByIdAndUpdate(packageId, { isActive: isActive }, { new: true }).lean();
        if (!pkg)
            throw new Error("Package not found");
        return {
            success: true,
            message: `Package ${isActive ? "activated" : "deactivated"} successfully`,
        };
    }
    static async getPackageById(packageId, isActive = true) {
        const pkg = await Package.findOne({
            _id: packageId,
            isActive: isActive,
        }).lean();
        if (!pkg)
            throw new Error("Package not found");
        return pkg;
    }
    static async getFullPackageDetails(serviceIds) {
        const services = await Service.find({ _id: { $in: serviceIds } }).lean();
        const variantMap = new Map();
        return;
    }
    static async getPackages({ search, category, serviceId, location, isActive, page = 1, limit = 20, sortBy = "displayOrder", sortOrder = "asc", }) {
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (search) {
            query.$text = { $search: search };
        }
        if (serviceId) {
            query["services.serviceId"] = new Types.ObjectId(serviceId);
        }
        if (category) {
            query.category = category;
        }
        if (location) {
            query.locations = location;
        }
        const sortCriteria = {};
        if (search && sortBy === "displayOrder") {
            sortCriteria.score = { $meta: "textScore" };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
        }
        try {
            const [packages, total] = await Promise.all([
                Package.find(query)
                    .select("name description image services locations displayOrder isActive pricing")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Package.countDocuments(query),
            ]);
            const serviceIds = packages.flatMap((p) => p.services.map((s) => s.serviceId));
            const services = await Service.find({
                _id: { $in: serviceIds },
                isActive: true,
            }).lean();
            const serviceMap = new Map();
            services.forEach((s) => serviceMap.set(s._id.toString(), s));
            const pricingService = new PricingService();
            const enrichedPackages = await Promise.all(packages.map(async (pkg) => {
                let computedPricing = null;
                if (pkg.pricing.type === "FIXED") {
                    const price = pkg.pricing.fixedPrice || 0;
                    computedPricing = {
                        subTotal: price,
                        discount: 0,
                        discountPercentage: 0,
                        total: price,
                    };
                }
                else {
                    let selectedVariantIds = [];
                    for (const svc of pkg.services) {
                        const service = serviceMap.get(svc.serviceId.toString());
                        if (!service)
                            continue;
                        const variantIds = this.extractVariantIds(service);
                        selectedVariantIds.push(...variantIds);
                    }
                    computedPricing = await pricingService.calculate({
                        type: "PACKAGE",
                        targetId: pkg._id.toString(),
                        selectedVariantIds,
                    });
                }
                return {
                    ...pkg,
                    computedPricing,
                };
            }));
            return {
                data: enrichedPackages,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            throw new Error(`Package fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=package.service.js.map