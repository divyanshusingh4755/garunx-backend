import { type ITier } from "../models/tier.model.js";
export declare class TierService {
    static createTier(tierData: ITier): Promise<import("mongoose").Document<unknown, {}, ITier, {}, import("mongoose").DefaultSchemaOptions> & ITier & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTier(id: string, tierData: Partial<ITier>): Promise<import("mongoose").Document<unknown, {}, ITier, {}, import("mongoose").DefaultSchemaOptions> & ITier & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getTierById(id: string): Promise<import("mongoose").Document<unknown, {}, ITier, {}, import("mongoose").DefaultSchemaOptions> & ITier & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleTierStatus(id: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, ITier, {}, import("mongoose").DefaultSchemaOptions> & ITier & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static FindTiers(limit: number | undefined, page: number | undefined, sortBy: string, sortOrder?: "asc" | "desc", searchTerm?: string, isActive?: boolean): Promise<{
        data: (ITier & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=tier.service.d.ts.map