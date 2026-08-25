import mongoose, { Types } from "mongoose";
import { TaxProfile } from "../models/tax-profile.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
import { HttpError } from "../utils/httpError.js";
export class TaxProfileService {
    static async invalidateTaxProfileCache(taxProfileId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.taxProfileListPattern()),
            RedisCacheService.delete(CacheKeys.activeTaxProfileList()),
        ];
        if (taxProfileId) {
            operations.push(RedisCacheService.delete(CacheKeys.taxProfileDetail(taxProfileId)));
        }
        await Promise.all(operations);
    }
    static async invalidateDependentPricingCaches() {
        await Promise.all([
            // ServicePricing.resolvePricing()
            RedisCacheService.deleteByPattern(CacheKeys.serviceResolvedPricingPattern()),
            // Service aggregate responses can contain populated tax configuration.
            RedisCacheService.deleteByPattern(CacheKeys.serviceFullPattern()),
            // PackageTierPricing.resolvePricing()
            RedisCacheService.deleteByPattern(CacheKeys.packageResolvedPricingPattern()),
            // Package aggregate responses include PackageTierPricing / tax data.
            RedisCacheService.deleteByPattern(CacheKeys.packageFullPattern()),
        ]);
    }
    static validateObjectId(id, fieldName = "taxProfileId") { if (!Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${fieldName}`);
    } }
    static toObjectId(value, fieldName) {
        const stringValue = value.toString();
        this.validateObjectId(stringValue, fieldName);
        return new Types.ObjectId(stringValue);
    }
    static normalizeOptionalString(value) {
        const normalized = value?.trim();
        return normalized || undefined;
    }
    static validateTreatmentRate(treatment, totalRate) {
        if (treatment === "TAXABLE" && totalRate <= 0) {
            throw new Error("Taxable tax profile must have a rate greater than zero");
        }
        if (treatment !== "TAXABLE" && totalRate !== 0) {
            throw new Error("Non-taxable tax profiles must have a rate equal to zero");
        }
    }
    static async createTaxProfile(payload) {
        const code = payload.code.trim().toUpperCase();
        const name = payload.name.trim();
        this.validateTreatmentRate(payload.treatment, payload.totalRate);
        const existingProfile = await TaxProfile.findOne({ code }).select("_id").lean();
        if (existingProfile) {
            throw new Error(`Tax profile with code ${code} already exists`);
        }
        const description = this.normalizeOptionalString(payload.description);
        const createPayload = { name, code, treatment: payload.treatment, totalRate: payload.totalRate, isActive: true };
        if (description) {
            createPayload.description = description;
        }
        if (payload.createdBy) {
            const createdBy = this.toObjectId(payload.createdBy, "createdBy");
            createPayload.createdBy = createdBy;
            createPayload.updatedBy = createdBy;
        }
        try {
            const taxProfile = await TaxProfile.create(createPayload);
            await this.invalidateTaxProfileCache();
            return taxProfile;
        }
        catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === 11000) {
                throw new Error(`Tax profile with code ${code} already exists`);
            }
            throw error;
        }
    }
    static async getTaxProfiles(filters = {}) {
        const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page : 1;
        const limit = Number.isInteger(filters.limit) && (filters.limit ?? 0) > 0 ? Math.min(filters.limit, 100) : 20;
        const normalizedSearch = filters.search?.trim();
        const cacheKey = CacheKeys.taxProfileList({ search: normalizedSearch, treatment: filters.treatment, isActive: filters.isActive, page, limit });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.TAX_PROFILE_LIST,
            loader: async () => {
                const skip = (page - 1) * limit;
                const query = {};
                if (filters.treatment) {
                    query.treatment = filters.treatment;
                }
                if (typeof filters.isActive === "boolean") {
                    query.isActive = filters.isActive;
                }
                if (normalizedSearch) {
                    const regex = { $regex: escapeRegex(normalizedSearch), $options: "i" };
                    query.$or = [{ name: regex }, { code: regex }];
                }
                const [taxProfiles, total] = await Promise.all([
                    TaxProfile.find(query)
                        .populate("createdBy", "fullName email role")
                        .populate("updatedBy", "fullName email role").sort({ isActive: -1, createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    TaxProfile.countDocuments(query),
                ]);
                const totalPages = Math.ceil(total / limit);
                return {
                    data: taxProfiles, pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
                };
            },
        });
    }
    static async getActiveTaxProfiles() {
        return RedisCacheService.getOrSet({
            key: CacheKeys.activeTaxProfileList(),
            ttlSeconds: CACHE_TTL_SECONDS.ACTIVE_TAX_PROFILE_LIST,
            loader: async () => {
                return TaxProfile.find({ isActive: true })
                    .select("name code treatment totalRate")
                    .sort({ treatment: 1, totalRate: 1, name: 1 })
                    .lean();
            },
        });
    }
    static async getTaxProfileById(taxProfileId) {
        this.validateObjectId(taxProfileId);
        return RedisCacheService.getOrSet({
            key: CacheKeys.taxProfileDetail(taxProfileId),
            ttlSeconds: CACHE_TTL_SECONDS.TAX_PROFILE_DETAIL,
            loader: async () => {
                const taxProfile = await TaxProfile.findById(taxProfileId)
                    .populate("createdBy", "fullName email role")
                    .populate("updatedBy", "fullName email role")
                    .lean();
                if (!taxProfile) {
                    throw new Error("Tax profile not found");
                }
                return taxProfile;
            },
        });
    }
    static async updateTaxProfile(taxProfileId, payload) {
        this.validateObjectId(taxProfileId);
        const taxProfile = await TaxProfile.findById(taxProfileId);
        if (!taxProfile) {
            throw new Error("Tax profile not found");
        }
        const nextTreatment = payload.treatment ?? taxProfile.treatment;
        const nextTotalRate = payload.totalRate ?? taxProfile.totalRate;
        this.validateTreatmentRate(nextTreatment, nextTotalRate);
        if (payload.name !== undefined) {
            taxProfile.name = payload.name.trim();
        }
        if (payload.treatment !== undefined) {
            taxProfile.treatment = payload.treatment;
        }
        if (payload.totalRate !== undefined) {
            taxProfile.totalRate = payload.totalRate;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "description")) {
            const description = this.normalizeOptionalString(payload.description);
            if (description) {
                taxProfile.description = description;
            }
            else {
                taxProfile.set("description", undefined);
            }
        }
        if (payload.updatedBy) {
            taxProfile.updatedBy = this.toObjectId(payload.updatedBy, "updatedBy");
        }
        const updatedTaxProfile = await taxProfile.save();
        await Promise.all([
            this.invalidateTaxProfileCache(taxProfileId),
            this.invalidateDependentPricingCaches(),
        ]);
        return updatedTaxProfile;
    }
    static async updateTaxProfileStatus(taxProfileId, isActive, updatedBy) {
        this.validateObjectId(taxProfileId);
        const objectId = new Types.ObjectId(taxProfileId);
        const session = await mongoose.startSession();
        let updatedTaxProfile = null;
        try {
            await session.withTransaction(async () => {
                const taxProfile = await TaxProfile.findById(objectId).session(session);
                if (!taxProfile) {
                    throw new Error("Tax profile not found");
                }
                if (taxProfile.isActive === isActive) {
                    updatedTaxProfile = taxProfile;
                    return;
                }
                // Pricing writers also modify pricingRevision. Deactivation writes this same TaxProfile document, so concurrent pricing/deactivation cannot both commit with a stale view.
                if (!isActive) {
                    const [servicePricingCount, packagePricingCount] = await Promise.all([
                        ServicePricing.countDocuments({ taxProfileId: objectId, isActive: true }).session(session),
                        PackageTierPricing.countDocuments({ taxProfileId: objectId }).session(session),
                    ]);
                    if (servicePricingCount > 0 || packagePricingCount > 0) {
                        const error = new Error("Cannot deactivate this tax profile because it is used by active service or package pricing. Reassign those pricing records first.");
                        error.statusCode = 409;
                        throw error;
                    }
                }
                taxProfile.isActive = isActive;
                if (updatedBy) {
                    taxProfile.updatedBy = this.toObjectId(updatedBy, "updatedBy");
                }
                updatedTaxProfile = await taxProfile.save({ session });
            });
        }
        finally {
            await session.endSession();
        }
        if (!updatedTaxProfile) {
            throw new Error("Unable to update tax profile status");
        }
        await Promise.all([
            this.invalidateTaxProfileCache(taxProfileId),
            this.invalidateDependentPricingCaches(),
        ]);
        return updatedTaxProfile;
    }
    static async exportTaxProfilesToCsv(taxProfileIds) {
        const uniqueTaxProfileIds = [...new Set(taxProfileIds)];
        const taxProfiles = await TaxProfile.find({ _id: { $in: uniqueTaxProfileIds } }).select(["code", "name", "treatment", "totalRate", "description", "isActive", "createdAt", "updatedAt"].join(" ")).sort({ name: 1, _id: 1 }).lean();
        if (taxProfiles.length === 0) {
            throw new HttpError(404, "No tax profiles found for export");
        }
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            let stringValue = String(value);
            // Protect CSV files opened in Excel / spreadsheet software from formula injection.
            if (/^[=+\-@]/.test(stringValue.trimStart())) {
                stringValue = `'${stringValue}`;
            }
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = ["Code", "Name", "Treatment", "Total Rate (%)", "Description", "Active", "Created At", "Updated At"];
        const rows = taxProfiles.map((taxProfile) => [taxProfile.code, taxProfile.name, taxProfile.treatment, taxProfile.totalRate, taxProfile.description ?? "", taxProfile.isActive ? "Yes" : "No", taxProfile.createdAt ? new Date(taxProfile.createdAt).toISOString() : "", taxProfile.updatedAt ? new Date(taxProfile.updatedAt).toISOString() : ""]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: taxProfiles.length };
    }
}
//# sourceMappingURL=taxprofile.service.js.map