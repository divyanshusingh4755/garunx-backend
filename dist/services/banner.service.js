import { Types } from "mongoose";
import { Banner } from "../models/banner.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { RedisCacheService } from "./redis-cache.service.js";
import { CacheKeys } from "../cache/cache-keys.js";
import { CACHE_TTL_SECONDS } from "../cache/constants.js";
export class BannerService {
    static async invalidateBannerCache(bannerId) {
        const operations = [RedisCacheService.deleteByPattern(CacheKeys.bannerListPattern())];
        if (bannerId) {
            operations.push(RedisCacheService.delete(CacheKeys.bannerDetail(bannerId)));
        }
        await Promise.all(operations);
    }
    static ensureValidId(id) { if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid banner ID");
    } }
    static async createBanner(bannerData) {
        if (!bannerData.name?.trim()) {
            throw new Error("Banner name is required");
        }
        if (!bannerData.description?.trim()) {
            throw new Error("Description is required");
        }
        if (!bannerData.image?.trim()) {
            throw new Error("Image is required");
        }
        if (!bannerData.placement) {
            throw new Error("Placement is required");
        }
        if (!bannerData.format) {
            throw new Error("Format is required");
        }
        const banner = new Banner(bannerData);
        await banner.validate();
        const savedBanner = await banner.save();
        // New banner can affect: - total count - pagination - placement filters - active filters - ordering
        await this.invalidateBannerCache();
        return savedBanner;
    }
    static async updateBanner(id, updateData) {
        this.ensureValidId(id);
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        const protectedFields = new Set(["_id", "version", "createdAt", "updatedAt", "__v"]);
        for (const [field, value] of Object.entries(updateData)) {
            if (protectedFields.has(field) || field === "redirect") {
                continue;
            }
            banner.set(field, value);
        }
        if (updateData.redirect !== undefined) {
            const incomingRedirect = updateData.redirect;
            const redirectType = incomingRedirect?.type ?? banner.redirect?.type ?? "NONE";
            banner.redirect = {
                type: redirectType,
                ...(["SERVICE", "PACKAGE", "CATEGORY", "PRODUCT"].includes(redirectType) && incomingRedirect?.refId ? { refId: incomingRedirect.refId } : {}),
                ...(redirectType === "URL" && incomingRedirect?.url ? { url: incomingRedirect.url } : {}),
            };
        }
        await banner.validate();
        const updatedBanner = await banner.save();
        await this.invalidateBannerCache(id);
        return updatedBanner;
    }
    static async getBannerById(id) {
        this.ensureValidId(id);
        return RedisCacheService.getOrSet({
            key: CacheKeys.bannerDetail(id),
            ttlSeconds: CACHE_TTL_SECONDS.BANNER_DETAIL,
            loader: async () => {
                const banner = await Banner.findById(id).lean();
                if (!banner) {
                    throw new Error("Banner not found");
                }
                return banner;
            },
        });
    }
    static async deleteBanner(id) {
        this.ensureValidId(id);
        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        await this.invalidateBannerCache(id);
        return banner;
    }
    static async toggleBannerStatus(id) {
        this.ensureValidId(id);
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        banner.isActive = !banner.isActive;
        const updatedBanner = await banner.save();
        await this.invalidateBannerCache(id);
        return updatedBanner;
    }
    static async findBanners(searchTerm, placement, format, redirectType, limit = 20, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        // Normalize pagination first.
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        // Normalize search.
        const normalizedSearch = searchTerm?.trim();
        const isTextSearch = Boolean(normalizedSearch && normalizedSearch.length > 4);
        // Whitelist sorting.
        const allowedSortFields = new Set(["displayOrder", "createdAt", "updatedAt", "name", "placement", "format", "isActive", "relevance"]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "displayOrder";
        // "relevance" only makes sense when using Mongo text search.
        const effectiveSortBy = safeSortBy === "relevance" && !isTextSearch ? "displayOrder" : safeSortBy;
        // Generate Redis key using normalized values that MongoDB will actually use.
        const cacheKey = CacheKeys.bannerList({ searchTerm: normalizedSearch, placement, format, redirectType, limit: safeLimit, page: safePage, isActive, sortBy: effectiveSortBy, sortOrder });
        return RedisCacheService.getOrSet({
            key: cacheKey,
            ttlSeconds: CACHE_TTL_SECONDS.BANNER_LIST,
            loader: async () => {
                const skip = safeLimit * (safePage - 1);
                const query = {};
                if (typeof isActive === "boolean") {
                    query.isActive = isActive;
                }
                if (placement) {
                    query.placement = placement;
                }
                if (format === "WEB") {
                    query.format = { $in: ["WEB", "BOTH"] };
                }
                else if (format === "MOBILE") {
                    query.format = { $in: ["MOBILE", "BOTH"] };
                }
                else if (format === "BOTH") {
                    query.format = "BOTH";
                }
                if (redirectType) {
                    query["redirect.type"] = redirectType;
                }
                // Search
                if (normalizedSearch) {
                    if (isTextSearch) {
                        query.$text = { $search: normalizedSearch };
                    }
                    else {
                        query.name = { $regex: `^${escapeRegex(normalizedSearch)}`, $options: "i" };
                    }
                }
                let projection = {};
                let sortCriteria;
                if (isTextSearch && effectiveSortBy === "relevance") {
                    // Your original code created projection but did not include the score field. Add it so text relevance behaves consistently.
                    projection = { score: { $meta: "textScore" } };
                    sortCriteria = { score: { $meta: "textScore" } };
                }
                else {
                    sortCriteria = { [effectiveSortBy]: sortOrder === "desc" ? -1 : 1 };
                    // Stable secondary sort.
                    if (effectiveSortBy !== "createdAt") {
                        sortCriteria.createdAt = -1;
                    }
                }
                try {
                    const [data, total] = await Promise.all([
                        Banner.find(query, projection).sort(sortCriteria).skip(skip).limit(safeLimit).lean(),
                        Banner.countDocuments(query),
                    ]);
                    return {
                        data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit),
                    };
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    throw new Error(`Banner fetch failed: ${message}`);
                }
            },
        });
    }
    static async exportBannersToCsv(bannerIds) {
        if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
            throw new Error("At least one banner ID is required");
        }
        if (bannerIds.length > 1000) {
            throw new Error("A maximum of 1000 banners can be exported at once");
        }
        const uniqueBannerIds = [...new Set(bannerIds)];
        for (const bannerId of uniqueBannerIds) {
            if (!Types.ObjectId.isValid(bannerId)) {
                throw new Error("Invalid banner ID");
            }
        }
        const banners = await Banner.find({ _id: { $in: uniqueBannerIds } }).select(["version", "name", "description", "buttonText", "placement", "format", "isActive", "image", "displayOrder", "redirect", "createdAt", "updatedAt"].join(" ")).lean();
        if (banners.length === 0) {
            throw new Error("No banners found for export");
        }
        const bannerMap = new Map(banners.map((banner) => [banner._id.toString(), banner]));
        // Preserve the same order in which IDs were received from frontend.
        const orderedBanners = uniqueBannerIds.map((bannerId) => bannerMap.get(bannerId)).filter((banner) => Boolean(banner));
        const escapeCsv = (value) => {
            if (value === null || value === undefined) {
                return "";
            }
            const stringValue = String(value);
            // Avoid spreadsheet formula execution for user-entered text.
            const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
            if (safeValue.includes(",") || safeValue.includes('"') || safeValue.includes("\n") || safeValue.includes("\r")) {
                return `"${safeValue.replace(/"/g, '""')}"`;
            }
            return safeValue;
        };
        const formatDate = (value) => {
            if (!value) {
                return "";
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "";
            }
            return date.toISOString();
        };
        const headers = ["Banner ID", "Version", "Name", "Description", "Button Text", "Placement", "Format", "Active", "Image", "Display Order", "Redirect Type", "Redirect Reference ID", "Redirect URL", "Created At", "Updated At"];
        const rows = orderedBanners.map((banner) => [banner._id.toString(), banner.version, banner.name, banner.description, banner.buttonText ?? "", banner.placement, banner.format, banner.isActive, banner.image, banner.displayOrder, banner.redirect?.type ?? "NONE", banner.redirect?.refId?.toString() ?? "", banner.redirect?.url ?? "", formatDate(banner.createdAt), formatDate(banner.updatedAt)]);
        const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
        return { csv, total: orderedBanners.length };
    }
}
//# sourceMappingURL=banner.service.js.map