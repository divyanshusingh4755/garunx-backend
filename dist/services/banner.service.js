import { Banner } from "../models/banner.model.js";
import { escapeRegex } from "../utils/escapeRegex.js";
export class BannerService {
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
        return await banner.save();
    }
    static async updateBanner(id, updateData) {
        delete updateData._id;
        delete updateData.version;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        const banner = await Banner.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            overwriteDiscriminatorKey: false,
        });
        if (!banner) {
            throw new Error("Banner not found");
        }
        return banner;
    }
    static async getBannerById(id) {
        const banner = await Banner.findById(id).lean();
        if (!banner) {
            throw new Error("Banner not found");
        }
        return banner;
    }
    static async deleteBanner(id) {
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        return await Banner.findByIdAndDelete(id);
    }
    static async toggleBannerStatus(id) {
        const banner = await Banner.findById(id);
        if (!banner) {
            throw new Error("Banner not found");
        }
        banner.isActive = !banner.isActive;
        await banner.save();
        return banner;
    }
    static async findBanners(searchTerm, placement, format, redirectType, limit = 20, page = 1, isActive, sortBy = "displayOrder", sortOrder = "asc") {
        const skip = limit * (page - 1);
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
        const isTextSearch = !!searchTerm?.trim() && searchTerm.trim().length >= 3;
        if (searchTerm?.trim()) {
            const term = searchTerm.trim();
            if (isTextSearch) {
                query.$text = {
                    $search: term,
                };
            }
            else {
                query.name = {
                    $regex: `^${escapeRegex(term)}`,
                    $options: "i",
                };
            }
        }
        let projection = {};
        let sortCriteria = {};
        if (isTextSearch && sortBy === "relevance") {
            projection = {
                score: { $meta: "textScore" },
            };
            sortCriteria = {
                score: { $meta: "textScore" },
            };
        }
        else {
            sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
            if (sortBy !== "createdAt") {
                sortCriteria.createdAt = -1;
            }
        }
        try {
            const [data, total] = await Promise.all([
                Banner.find(query, projection)
                    .sort(sortCriteria)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Banner.countDocuments(query),
            ]);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            throw new Error(`Banner fetch failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=banner.service.js.map