import { Types } from "mongoose";
import { type IBanner } from "../models/banner.model.js";
type RedirectType = "NONE" | "SERVICE" | "PACKAGE" | "CATEGORY" | "PRODUCT" | "URL";
export declare class BannerService {
    private static invalidateBannerCache;
    private static ensureValidId;
    static createBanner(bannerData: Partial<IBanner>): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateBanner(id: string, updateData: Partial<IBanner>): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getBannerById(id: string): Promise<IBanner & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteBanner(id: string): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleBannerStatus(id: string): Promise<import("mongoose").Document<unknown, {}, IBanner, {}, import("mongoose").DefaultSchemaOptions> & IBanner & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findBanners(searchTerm?: string, placement?: string, format?: string, redirectType?: RedirectType, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IBanner & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static exportBannersToCsv(bannerIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=banner.service.d.ts.map