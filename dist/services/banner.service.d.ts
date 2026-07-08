import { type IBanner } from "../models/banner.model.js";
export declare class BannerService {
    static createBanner(bannerData: Partial<IBanner>): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateBanner(id: string, updateData: Partial<IBanner>): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getBannerById(id: string): Promise<IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteBanner(id: string): Promise<(import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static toggleBannerStatus(id: string): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findBanners(searchTerm?: string, placement?: string, format?: string, redirectType?: "NONE" | "SERVICE" | "PACKAGE" | "CATEGORY" | "PRODUCT" | "URL", limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IBanner & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=banner.service.d.ts.map