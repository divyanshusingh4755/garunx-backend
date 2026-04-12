import { Types } from "mongoose";
import { Package } from "../models/package.model.js";
import { Service } from "../models/service.model.js";
export class PackageService {
    static async validateServices(serviceIds) {
        if (!serviceIds || serviceIds.length === 0) {
            throw new Error("At least one service is required");
        }
        const uniqueIds = [...new Set(serviceIds)];
        const objectIds = uniqueIds.map(id => new Types.ObjectId(id));
        const services = await Service.find({
            _id: { $in: objectIds }
        });
        if (services.length !== objectIds.length) {
            throw new Error("One or more services are invalid");
        }
        const inactive = services.find(s => !s.isActive);
        if (inactive) {
            throw new Error(`Service ${inactive.name} is inactive`);
        }
        return services;
    }
    static async createPackage(payload) {
        const { name, description, image, services, locations, pricing, createdBy } = payload;
        const serviceIds = services.map(s => s.serviceId);
        const validatedServices = await this.validateServices(serviceIds);
        const servicePayload = validatedServices.map((s, index) => ({
            serviceId: s._id,
            displayOrder: index
        }));
        const finalPricing = {
            type: pricing?.type || "DERIVED",
            discountPercentage: pricing?.discountPercentage || 0,
            ...(pricing?.fixedPrice !== undefined && { fixedPrice: pricing.fixedPrice })
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
            const incomingServiceIds = updateData.services.map((s) => typeof s === 'string' ? s : s.serviceId);
            const validated = await this.validateServices(incomingServiceIds);
            const newServiceIds = validated.map(s => s._id.toString()).sort();
            const oldServiceIds = existing.services.map(s => s.serviceId.toString()).sort();
            if (JSON.stringify(newServiceIds) !== JSON.stringify(oldServiceIds)) {
                shouldIncrementVersion = true;
                // 3. Map back to the required schema structure
                updatedServices = validated.map((s, index) => {
                    // Find the original displayOrder if provided, otherwise use index
                    const original = updateData.services.find((income) => (income.serviceId || income) === s._id.toString());
                    return {
                        serviceId: s._id,
                        displayOrder: original?.displayOrder ?? index
                    };
                });
            }
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
        if (updateData.description && updateData.description !== existing.description) {
            shouldIncrementVersion = true;
        }
        const updatePayload = {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description && { description: updateData.description }),
            ...(updateData.image && { image: updateData.image }),
            ...(updateData.locations && { locations: updateData.locations }),
            ...(updateData.pricing && { pricing: updateData.pricing }),
            ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
            ...(updateData.displayOrder !== undefined && { displayOrder: updateData.displayOrder }),
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
            isActive: true
        }).lean();
        if (!pkg)
            throw new Error("Package not found");
        const serviceIds = pkg.services.map(s => s.serviceId);
        const services = await Service.find({
            _id: { $in: serviceIds },
            isActive: true
        }).populate({
            path: "subServices.variants.variantId",
            model: "Product"
        }).lean();
        const enrichedServices = services.map(service => ({
            ...service,
            subServices: service.subServices.map(sub => ({
                ...sub,
                products: sub.variants.map((vEntry) => {
                    const productDoc = vEntry.variantId;
                    if (!productDoc)
                        return null;
                    const filteredVariants = (productDoc.variants || []).filter((v) => v.location === location && v.isActive);
                    return {
                        ...productDoc,
                        instanceDetails: {
                            isOptional: vEntry.isOptional,
                            displayOrder: vEntry.displayOrder
                        },
                        variants: filteredVariants
                    };
                }).filter(Boolean)
            }))
        }));
        return {
            ...pkg,
            services: enrichedServices
        };
    }
    static async updatePackageStatus(packageId, isActive) {
        const pkg = await Package.findByIdAndUpdate(packageId, { isActive: isActive }, { new: true }).lean();
        if (!pkg)
            throw new Error("Package not found");
        return {
            success: true,
            message: `Package ${isActive ? "activated" : "deactivated"} successfully`
        };
    }
    static async getPackageById(packageId, isActive = true) {
        const pkg = await Package.findOne({
            _id: packageId,
            isActive: isActive
        }).lean();
        if (!pkg)
            throw new Error("Package not found");
        return pkg;
    }
    static async getPackages({ search, serviceId, location, isActive, page = 1, limit = 20, sortBy = "displayOrder", sortOrder = "asc" }) {
        const skip = (page - 1) * limit;
        const query = {};
        if (typeof isActive === 'boolean') {
            query.isActive = isActive;
        }
        if (search) {
            query.$text = { $search: search };
        }
        if (serviceId) {
            query["services.serviceId"] = new Types.ObjectId(serviceId);
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
                    .select("name description services locations displayOrder isActive pricing")
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Package.countDocuments(query)
            ]);
            return {
                data: packages,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            throw new Error(`Package fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=package.service.js.map