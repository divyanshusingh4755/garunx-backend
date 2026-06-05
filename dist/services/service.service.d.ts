import { Types } from "mongoose";
import mongoose from "mongoose";
export declare class ServiceService {
    static createService(payload: any): Promise<mongoose.Document<unknown, {}, import("../models/service.model.js").IService, {}, mongoose.DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, payload: any): Promise<mongoose.Document<unknown, {}, import("../models/service.model.js").IService, {}, mongoose.DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceById(serviceId: string): Promise<import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getDeactivationImpact(serviceId: string): Promise<{
        packageUsageCount: number;
        packagePricingCount: number;
        servicePricingCount: number;
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
        servicePricing: (import("../models/servicepricing.model.js").IServicePricing & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleServiceStatus(serviceId: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        message: string;
        requiresConfirmation?: never;
        impact?: never;
    } | {
        requiresConfirmation: boolean;
        message: string;
        impact: {
            packageUsageCount: number;
            packagePricingCount: number;
            servicePricingCount: number;
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
            servicePricing: (import("../models/servicepricing.model.js").IServicePricing & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        success?: never;
    }>;
    static getServicesByLocation(cityIds: string[], limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static FindServices(searchTerm?: string, categoryId?: string, locationId?: string, limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (import("../models/service.model.js").IService & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateServiceLocations(serviceId: string, locations: {
        locationId: string;
    }[]): Promise<{
        success: boolean;
        message: string;
        locations: {
            locationId: any;
            name: any;
            isActive: boolean;
        }[];
    }>;
    static removeServiceLocation(serviceId: string, locationId: string): Promise<{
        success: boolean;
        message: string;
        locations: import("../models/service.model.js").ILocationService[];
    }>;
    static updateServiceTiers(serviceId: string, tiers: {
        tierId: string;
    }[]): Promise<{
        success: boolean;
        message: string;
        tiers?: never;
    } | {
        success: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
    }>;
    static removeServiceTier(serviceId: string, tierId: string): Promise<{
        success: boolean;
        message: string;
        tiers?: never;
    } | {
        success: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
    }>;
    static getFullService(serviceId: string): Promise<{
        service: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            category: {
                id: Types.ObjectId;
                label: string;
                value: string;
                image: string | undefined;
            } | null;
            isActive: boolean;
            isComplete: boolean;
            serviceReference: string;
        };
        subServiceComponents: any[];
        locations: import("../models/service.model.js").ILocationService[];
        tiers: {
            tierId: Types.ObjectId;
            name: string;
        }[];
        components: Record<string, any>;
    }>;
    static getFullServiceByCities(serviceId: string, cityIds: string[]): Promise<{
        service: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            isActive: boolean;
            isComplete: boolean;
            serviceReference: string;
        };
        subServiceComponents: any[];
        locations: any[];
        tiers: {
            tierId: Types.ObjectId;
            name: string;
        }[];
        components: Record<string, any>;
    }>;
    static updateServiceStartingPrice(serviceId: string): Promise<void>;
    static validateServiceConfiguration(serviceId: string): Promise<{
        isComplete: boolean;
        issues: string[];
    }>;
}
//# sourceMappingURL=service.service.d.ts.map