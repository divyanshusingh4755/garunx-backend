import mongoose, { Types } from "mongoose";
import { type ITier } from "../models/tier.model.js";
export declare class TierService {
    static createTier(tierData: ITier): Promise<mongoose.Document<unknown, {}, ITier, {}, mongoose.DefaultSchemaOptions> & ITier & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTier(id: string, tierData: Partial<ITier>): Promise<mongoose.Document<unknown, {}, ITier, {}, mongoose.DefaultSchemaOptions> & ITier & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getTierById(id: string): Promise<ITier & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getDeactivationImpact(tierId: string): Promise<{
        serviceComponentCount: number;
        servicePricingCount: number;
        packageMappingCount: number;
        packagePricingCount: number;
        serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        servicePricing: (import("../models/servicepricing.model.js").IServicePricing & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        packageMappings: (import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        packagePricing: (import("../models/packagetierpricing.model.js").IPackageTierPricing & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleTierStatus(id: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        requiresConfirmation: false;
        isActive: boolean;
        message: string;
        impact?: never;
    } | {
        success: boolean;
        requiresConfirmation: true;
        message: string;
        impact: {
            serviceComponentCount: number;
            servicePricingCount: number;
            packageMappingCount: number;
            packagePricingCount: number;
            serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
            servicePricing: (import("../models/servicepricing.model.js").IServicePricing & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
            packageMappings: (import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
            packagePricing: (import("../models/packagetierpricing.model.js").IPackageTierPricing & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        isActive?: never;
    }>;
    static findTiers(limit?: number, page?: number, sortBy?: string, sortOrder?: "asc" | "desc", searchTerm?: string, isActive?: boolean): Promise<{
        data: (ITier & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=tier.service.d.ts.map