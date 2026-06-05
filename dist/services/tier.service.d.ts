import mongoose from "mongoose";
import { type ITier } from "../models/tier.model.js";
export declare class TierService {
    static createTier(tierData: ITier): Promise<mongoose.Document<unknown, {}, ITier, {}, mongoose.DefaultSchemaOptions> & ITier & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTier(id: string, tierData: Partial<ITier>): Promise<mongoose.Document<unknown, {}, ITier, {}, mongoose.DefaultSchemaOptions> & ITier & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getTierById(id: string): Promise<mongoose.Document<unknown, {}, ITier, {}, mongoose.DefaultSchemaOptions> & ITier & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getDeactivationImpact(tierId: string): Promise<{
        serviceComponentCount: number;
        servicePricingCount: number;
        packageMappingCount: number;
        packagePricingCount: number;
        serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        servicePricing: (import("../models/servicepricing.model.js").IServicePricing & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        packageMappings: (import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        packagePricing: (import("../models/packagetierpricing.model.js").IPackageTierPricing & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleTierStatus(id: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        message: string;
        requiresConfirmation?: never;
        impact?: never;
    } | {
        requiresConfirmation: boolean;
        message: string;
        impact: {
            serviceComponentCount: number;
            servicePricingCount: number;
            packageMappingCount: number;
            packagePricingCount: number;
            serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
            servicePricing: (import("../models/servicepricing.model.js").IServicePricing & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
            packageMappings: (import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
            packagePricing: (import("../models/packagetierpricing.model.js").IPackageTierPricing & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        success?: never;
    }>;
    static FindTiers(limit: number | undefined, page: number | undefined, sortBy: string, sortOrder?: "asc" | "desc", searchTerm?: string, isActive?: boolean): Promise<{
        data: (ITier & {
            _id: mongoose.Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=tier.service.d.ts.map