import mongoose, { Types } from "mongoose";
import { PackageTierMap } from "../models/packagetiermap.model.js";
import { PackageTierPricing } from "../models/packagetierpricing.model.js";
import { ServiceComponent } from "../models/servicecomponent.model.js";
import { ServicePricing } from "../models/servicepricing.model.js";
import { Tier } from "../models/tier.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
export class TierService {
    static async invalidateTierCache(tierId) {
        const operations = [
            RedisCacheService.deleteByPattern(CacheKeys.tierListPattern()),
        ];
        if (tierId) {
            operations.push(RedisCacheService.delete(CacheKeys.tierDetail(tierId)));
        }
        await Promise.all(operations);
    }
    static async invalidateTierDependents() {
        await Promise.all([
            RedisCacheService.deleteByPattern(CacheKeys.serviceComponentPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceResolvedPricingPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceByLocationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.serviceFullPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageTierServicesPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageResolvedPricingPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageByLocationListPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageDetailPattern()),
            RedisCacheService.deleteByPattern(CacheKeys.packageFullPattern()),
        ]);
    }
    static async createTier(tierData) {
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
                throw new Error(`Tier with name '${tierData.name}' already exists`);
            }
            throw new Error(`Tier with reference '${tierData.tierReference}' already exists`);
        }
        const tier = new Tier(tierData);
        const savedTier = await tier.save();
        await this.invalidateTierCache();
        return savedTier;
    }
    static async updateTier(id, tierData) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid tier id");
        }
        const duplicateConditions = [];
        if (tierData.name) {
            duplicateConditions.push({
                name: tierData.name,
            });
        }
        /*
         * Only check duplicate reference
         * when a new reference is actually supplied.
         *
         * null means remove the reference.
         */
        if (typeof tierData.tierReference === "string" &&
            tierData.tierReference) {
            duplicateConditions.push({
                tierReference: tierData.tierReference,
            });
        }
        if (duplicateConditions.length > 0) {
            const existing = await Tier.findOne({
                _id: {
                    $ne: id,
                },
                $or: duplicateConditions,
            });
            if (existing) {
                if (tierData.name &&
                    existing.name === tierData.name) {
                    throw new Error(`Tier with name '${tierData.name}' already exists`);
                }
                throw new Error(`Tier with reference '${tierData.tierReference}' already exists`);
            }
        }
        const $set = {};
        const $unset = {};
        if (tierData.name !== undefined) {
            $set.name =
                tierData.name;
        }
        if (tierData.tierReference === null) {
            /*
             * null explicitly means:
             * remove tierReference completely.
             */
            $unset.tierReference = 1;
        }
        else if (tierData.tierReference !== undefined) {
            $set.tierReference =
                tierData.tierReference;
        }
        const updateOperation = {};
        if (Object.keys($set).length > 0) {
            updateOperation.$set =
                $set;
        }
        if (Object.keys($unset).length > 0) {
            updateOperation.$unset =
                $unset;
        }
        const tier = await Tier.findByIdAndUpdate(id, updateOperation, {
            new: true,
            runValidators: true,
        });
        if (!tier) {
            throw new Error("Tier not found");
        }
        await Promise.all([
            this.invalidateTierCache(id),
            this.invalidateTierDependents(),
        ]);
        return tier;
    }
    static async getTierById(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid tier id");
        }
        return RedisCacheService.getOrSet({
            key: CacheKeys.tierDetail(id),
            ttlSeconds: CACHE_TTL_SECONDS
                .TIER_DETAIL,
            loader: async () => {
                const tier = await Tier.findById(id).lean();
                if (!tier) {
                    throw new Error("Tier not found");
                }
                return tier;
            },
        });
    }
    static async getDeactivationImpact(tierId) {
        const [serviceComponents, servicePricing, packageMappings, packagePricing] = await Promise.all([
            ServiceComponent.find({ tierId }, {
                _id: 1,
                serviceId: 1,
                componentId: 1,
            }).lean(),
            ServicePricing.find({ tierId }, {
                _id: 1,
                serviceId: 1,
                componentId: 1,
            }).lean(),
            PackageTierMap.find({ tierId }, {
                _id: 1,
                packageId: 1,
            }).lean(),
            PackageTierPricing.find({ tierId }, {
                _id: 1,
                packageId: 1,
                serviceId: 1,
            }).lean(),
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
    static async toggleTierStatus(id, isActive, confirmed = false) {
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
                requiresConfirmation: false,
                isActive: tier.isActive,
                message: `Tier already ${isActive ? "active" : "inactive"}`,
            };
        }
        if (!isActive && !confirmed) {
            const impact = await this.getDeactivationImpact(id);
            const hasImpact = impact.serviceComponentCount > 0 ||
                impact.servicePricingCount > 0 ||
                impact.packageMappingCount > 0 ||
                impact.packagePricingCount > 0;
            if (hasImpact) {
                return {
                    success: true,
                    requiresConfirmation: true,
                    message: "Tier is used in services and packages. Are you sure?",
                    impact,
                };
            }
        }
        const updatedTier = await Tier.findByIdAndUpdate(id, {
            $set: {
                isActive,
            },
        }, {
            new: true,
            runValidators: true,
        });
        if (!updatedTier) {
            throw new Error("Tier not found");
        }
        await Promise.all([
            this.invalidateTierCache(id),
            this.invalidateTierDependents(),
        ]);
        return {
            success: true,
            requiresConfirmation: false,
            isActive,
            message: `Tier ${isActive ? "activated" : "deactivated"} successfully`,
        };
    }
    static async findTiers(limit = 40, page = 1, sortBy = "createdAt", sortOrder = "asc", searchTerm, isActive) {
        const safeLimit = Number.isInteger(limit) &&
            limit > 0
            ? Math.min(limit, 100)
            : 40;
        const safePage = Number.isInteger(page) &&
            page > 0
            ? page
            : 1;
        const trimmedSearchTerm = searchTerm?.trim();
        const isTextSearch = Boolean(trimmedSearchTerm &&
            trimmedSearchTerm.length > 4);
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
        const effectiveSortBy = safeSortBy === "relevance" &&
            !isTextSearch
            ? "createdAt"
            : safeSortBy;
        const cacheKey = CacheKeys.tierList({
            searchTerm: trimmedSearchTerm,
            limit: safeLimit,
            page: safePage,
            isActive,
            sortBy: effectiveSortBy,
            sortOrder,
        });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS
                .TIER_LIST,
            loader: async () => {
                const skip = safeLimit *
                    (safePage - 1);
                const query = {};
                if (typeof isActive ===
                    "boolean") {
                    query.isActive =
                        isActive;
                }
                if (trimmedSearchTerm) {
                    if (isTextSearch) {
                        query.$text = {
                            $search: trimmedSearchTerm,
                        };
                    }
                    else {
                        query.name = {
                            $regex: `^${escapeRegex(trimmedSearchTerm)}`,
                            $options: "i",
                        };
                    }
                }
                let sortCriteria = {};
                let projection = {};
                if (isTextSearch &&
                    effectiveSortBy ===
                        "relevance") {
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
                    sortCriteria[effectiveSortBy] =
                        sortOrder ===
                            "desc"
                            ? -1
                            : 1;
                    if (effectiveSortBy !==
                        "createdAt") {
                        sortCriteria.createdAt =
                            -1;
                    }
                }
                try {
                    const [data, total,] = await Promise.all([
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
                        totalPages: Math.ceil(total /
                            safeLimit),
                    };
                }
                catch (error) {
                    throw new Error(`Tier fetch failed: ${error.message}`);
                }
            },
        });
    }
    static async exportTiersToCsv(tierIds) {
        const uniqueTierIds = [
            ...new Set(tierIds),
        ];
        const tiers = await Tier.find({
            _id: {
                $in: uniqueTierIds,
            },
        })
            .select([
            "name",
            "tierReference",
            "isActive",
            "createdAt",
            "updatedAt",
        ].join(" "))
            .sort({
            createdAt: -1,
        })
            .lean();
        if (tiers.length === 0) {
            throw new Error("No tiers found for export");
        }
        const escapeCsv = (value) => {
            if (value === null ||
                value === undefined) {
                return "";
            }
            let stringValue = String(value);
            /*
             * Prevent spreadsheet formula injection
             * when CSV is opened in Excel/Sheets.
             */
            if (/^[=+\-@]/.test(stringValue)) {
                stringValue =
                    `'${stringValue}`;
            }
            if (stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n") ||
                stringValue.includes("\r")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        const headers = [
            "Tier ID",
            "Name",
            "Tier Reference",
            "Status",
            "Created At",
            "Updated At",
        ];
        const rows = tiers.map((tier) => [
            tier._id.toString(),
            tier.name,
            tier.tierReference ?? "",
            tier.isActive
                ? "Active"
                : "Inactive",
            tier.createdAt
                ? new Date(tier.createdAt).toISOString()
                : "",
            tier.updatedAt
                ? new Date(tier.updatedAt).toISOString()
                : "",
        ]);
        const csv = [
            headers
                .map(escapeCsv)
                .join(","),
            ...rows.map((row) => row
                .map(escapeCsv)
                .join(",")),
        ].join("\n");
        return {
            csv,
            total: tiers.length,
        };
    }
}
//# sourceMappingURL=tier.service.js.map