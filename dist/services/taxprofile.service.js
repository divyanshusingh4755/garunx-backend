import { Types } from "mongoose";
import { TaxProfile, } from "../models/tax-profile.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
export class TaxProfileService {
    static async getTaxProfileUsage(taxProfileId) {
        const [servicePricing, packagePricing,] = await Promise.all([
            ServicePricing.find({
                taxProfileId,
                isActive: true,
            })
                .populate("serviceId", "name")
                .populate("locationId", "name")
                .populate("tierId", "name")
                .populate("componentId", "name")
                .select(`
                serviceId
                locationId
                tierId
                componentId
                `)
                .lean(),
            PackageTierPricing.find({
                taxProfileId,
                isActive: true,
            })
                .populate("packageId", "name")
                .populate("locationId", "name")
                .populate("tierId", "name")
                .populate("serviceId", "name")
                .select(`
                packageId
                locationId
                tierId
                serviceId
                `)
                .lean(),
        ]);
        const serviceMap = new Map();
        for (const pricing of servicePricing) {
            const service = pricing.serviceId;
            if (!service?._id) {
                continue;
            }
            const serviceId = service._id.toString();
            const existing = serviceMap.get(serviceId);
            if (existing) {
                existing.pricingCount += 1;
            }
            else {
                serviceMap.set(serviceId, {
                    serviceId,
                    serviceName: service.name ?? "Unknown service",
                    pricingCount: 1,
                });
            }
        }
        const packageMap = new Map();
        for (const pricing of packagePricing) {
            const pkg = pricing.packageId;
            if (!pkg?._id) {
                continue;
            }
            const packageId = pkg._id.toString();
            const existing = packageMap.get(packageId);
            if (existing) {
                existing.pricingCount += 1;
            }
            else {
                packageMap.set(packageId, {
                    packageId,
                    packageName: pkg.name ?? "Unknown package",
                    pricingCount: 1,
                });
            }
        }
        const services = Array.from(serviceMap.values());
        const packages = Array.from(packageMap.values());
        return {
            services,
            packages,
            summary: {
                servicePricingCount: servicePricing.length,
                packagePricingCount: packagePricing.length,
                affectedServiceCount: services.length,
                affectedPackageCount: packages.length,
            },
        };
    }
    static validateObjectId(id, fieldName = "taxProfileId") {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${fieldName}`);
        }
    }
    static normalizeOptionalString(value) {
        const normalized = value?.trim();
        return normalized || undefined;
    }
    static async createTaxProfile(payload) {
        const code = payload.code
            .trim()
            .toUpperCase();
        const name = payload.name.trim();
        const existingProfile = await TaxProfile.findOne({
            code,
        }).lean();
        if (existingProfile) {
            throw new Error(`Tax profile with code ${code} already exists`);
        }
        const description = this.normalizeOptionalString(payload.description);
        const createdBy = payload.createdBy
            ? new Types.ObjectId(payload.createdBy.toString())
            : undefined;
        const taxProfile = await TaxProfile.create({
            name,
            code,
            treatment: payload.treatment,
            totalRate: payload.totalRate,
            isActive: true,
            ...(description
                ? {
                    description,
                }
                : {}),
            ...(createdBy
                ? {
                    createdBy,
                    updatedBy: createdBy,
                }
                : {}),
        });
        return taxProfile;
    }
    static async getTaxProfiles(filters = {}) {
        const page = Math.max(Number(filters.page) || 1, 1);
        const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const query = {};
        if (filters.treatment) {
            query.treatment = filters.treatment;
        }
        if (typeof filters.isActive === "boolean") {
            query.isActive = filters.isActive;
        }
        if (filters.search?.trim()) {
            const search = filters.search.trim();
            query.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    code: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    sacCode: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }
        const [taxProfiles, total] = await Promise.all([
            TaxProfile.find(query)
                .populate("createdBy", "fullName email role")
                .populate("updatedBy", "fullName email role")
                .sort({
                isActive: -1,
                createdAt: -1,
            })
                .skip(skip)
                .limit(limit)
                .lean(),
            TaxProfile.countDocuments(query),
        ]);
        return {
            data: taxProfiles,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPreviousPage: page > 1,
            },
        };
    }
    static async getActiveTaxProfiles() {
        const now = new Date();
        return TaxProfile.find({
            isActive: true,
        })
            .select(`
        name
        code
        treatment
        totalRate
        `)
            .sort({
            treatment: 1,
            totalRate: 1,
            name: 1,
        })
            .lean();
    }
    static async getTaxProfileById(taxProfileId) {
        this.validateObjectId(taxProfileId);
        const taxProfile = await TaxProfile.findById(taxProfileId)
            .populate("createdBy", "fullName email role")
            .populate("updatedBy", "fullName email role")
            .lean();
        if (!taxProfile) {
            throw new Error("Tax profile not found");
        }
        return taxProfile;
    }
    static async updateTaxProfile(taxProfileId, payload) {
        this.validateObjectId(taxProfileId);
        const taxProfile = await TaxProfile.findById(taxProfileId);
        if (!taxProfile) {
            throw new Error("Tax profile not found");
        }
        if (payload.name !== undefined) {
            taxProfile.name =
                payload.name.trim();
        }
        if (payload.treatment !== undefined) {
            taxProfile.treatment =
                payload.treatment;
        }
        if (payload.totalRate !== undefined) {
            taxProfile.totalRate =
                payload.totalRate;
        }
        if (payload.description !== undefined) {
            const description = this.normalizeOptionalString(payload.description);
            if (description) {
                taxProfile.description =
                    description;
            }
            else {
                taxProfile.set("description", undefined);
            }
        }
        if (payload.updatedBy) {
            taxProfile.updatedBy =
                new Types.ObjectId(payload.updatedBy.toString());
        }
        await taxProfile.save();
        return taxProfile;
    }
    static async updateTaxProfileStatus(taxProfileId, isActive, updatedBy) {
        this.validateObjectId(taxProfileId);
        const taxProfile = await TaxProfile.findById(taxProfileId);
        if (!taxProfile) {
            throw new Error("Tax profile not found");
        }
        /*
         * Avoid unnecessary database work when the requested
         * status is already applied.
         */
        if (taxProfile.isActive === isActive) {
            return taxProfile;
        }
        if (!isActive) {
            const usage = await this.getTaxProfileUsage(taxProfile._id);
            const isInUse = usage.summary.servicePricingCount > 0 ||
                usage.summary.packagePricingCount > 0;
            if (!isActive) {
                const usage = await this.getTaxProfileUsage(taxProfile._id);
                if (isInUse) {
                    return {
                        success: false,
                        message: "Cannot deactivate this tax profile because it is used by active service or package pricing. Reassign those pricing records first.",
                        usage,
                    };
                }
            }
        }
        taxProfile.isActive = isActive;
        if (updatedBy) {
            taxProfile.updatedBy =
                new Types.ObjectId(updatedBy.toString());
        }
        await taxProfile.save();
        return taxProfile;
    }
}
//# sourceMappingURL=taxprofile.service.js.map