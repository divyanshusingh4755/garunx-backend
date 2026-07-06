import { Banner, type IBanner } from "../models/banner.model.js";

export class BannerService {
  static async createBanner(bannerData: Partial<IBanner>) {
    if (!bannerData.name) {
      throw new Error("Banner name is required");
    }

    if (!bannerData.image) {
      throw new Error("Image is required");
    }

    if (!bannerData.description) {
      throw new Error("Description is required");
    }

    const banner = new Banner(bannerData);
    return await banner.save();
  }

  static async updateBanner(id: string, updateData: Partial<IBanner>) {
    const banner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!banner) {
      throw new Error("Banner not found");
    }

    return banner;
  }

  static async getBannerById(id: string) {
    const banner = await Banner.findById(id).lean();

    if (!banner) {
      throw new Error("Banner not found");
    }

    return banner;
  }

  static async deleteBanner(id: string) {
    const banner = await Banner.findById(id);

    if (!banner) {
      throw new Error("Banner not found");
    }

    return await Banner.findByIdAndDelete(id);
  }

  static async toggleBannerStatus(id: string) {
    const banner = await Banner.findById(id);

    if (!banner) {
      throw new Error("Banner not found");
    }

    banner.isActive = !banner.isActive;

    await banner.save();

    return banner;
  }

  static async findBanners(
    searchTerm?: string,
    placement?: string,
    format?: string,
    limit: number = 20,
    page: number = 1,
    isActive?: boolean,
    sortBy: string = "displayOrder",
    sortOrder: "asc" | "desc" = "asc",
  ) {
    const skip = limit * (page - 1);

    const query: any = {};

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    }

    if (searchTerm) {
      query.$or = [
        {
          name: {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          description: {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ];
    }

    if (placement) {
      query.placement = placement;
    }

    if (format) {
      query.format = format;
    }

    const sortCriteria: any = {};

    sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;

    if (sortBy === "createdAt") {
      sortCriteria.createdAt = -1;
    }

    try {
      const [data, total] = await Promise.all([
        Banner.find(query).sort(sortCriteria).skip(skip).limit(limit).lean(),

        Banner.countDocuments(query),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Banner fetch failed: ${error.message}`);
    }
  }
}
