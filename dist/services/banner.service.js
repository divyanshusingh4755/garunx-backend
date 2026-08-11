import { Types } from "mongoose";
import { Banner } from "../models/banner.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class BannerService {
    static ensureValidId(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid banner ID");
        }
    }
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
        return banner.save();
    }
    static async updateBanner(id, updateData) {
        this.ensureValidId(id);
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        const protectedFields = new Set([
            "_id",
            "version",
            "createdAt",
            "updatedAt",
            "__v",
        ]);
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
                ...(["SERVICE", "PACKAGE", "CATEGORY", "PRODUCT"].includes(redirectType) && incomingRedirect?.refId
                    ? {
                        refId: incomingRedirect.refId,
                    }
                    : {}),
                ...(redirectType === "URL" && incomingRedirect?.url
                    ? {
                        url: incomingRedirect.url,
                    }
                    : {}),
            };
        }
        await banner.validate();
        return banner.save();
    }
    static async getBannerById(id) {
        this.ensureValidId(id);
        const banner = await Banner.findById(id).lean();
        if (!banner) {
            throw new Error("Banner not found");
        }
        return banner;
    }
    static async deleteBanner(id) {
        this.ensureValidId(id);
        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        return banner;
    }
    static async toggleBannerStatus(id) {
        this.ensureValidId(id);
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        banner.isActive = !banner.isActive;
        return banner.save();
    }
    static async findBanners(searchTerm, placement, format, redirectType, limit = 20, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const safePage = Number.isInteger(page) && page > 0 ? page : 1;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
        const skip = safeLimit * (safePage - 1);
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (placement) {
            query.placement = placement;
        }
        if (format) {
            query.format = format;
        }
        if (redirectType) {
            query["redirect.type"] = redirectType;
        }
        const normalizedSearch = searchTerm?.trim();
        const isTextSearch = Boolean(normalizedSearch && normalizedSearch.length > 4);
        if (normalizedSearch) {
            if (isTextSearch) {
                query.$text = {
                    $search: normalizedSearch,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(normalizedSearch)}`,
                    $options: "i",
                };
            }
        }
        const allowedSortFields = new Set([
            "displayOrder",
            "createdAt",
            "updatedAt",
            "name",
            "placement",
            "format",
            "isActive",
            "relevance",
        ]);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "displayOrder";
        let projection = {};
        let sortCriteria;
        if (isTextSearch && safeSortBy === "relevance") {
            sortCriteria = {
                score: {
                    $meta: "textScore",
                },
            };
        }
        else {
            const actualSortField = safeSortBy === "relevance" ? "displayOrder" : safeSortBy;
            sortCriteria = {
                [actualSortField]: sortOrder === "desc" ? -1 : 1,
            };
            if (actualSortField !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                Banner.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(safeLimit)
                    .lean(),
                Banner.countDocuments(query),
            ]);
            return {
                data,
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Banner fetch failed: ${message}`);
        }
    }
}
//# sourceMappingURL=banner.service.js.map