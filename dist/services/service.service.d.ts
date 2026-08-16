import mongoose, { Types } from "mongoose";
import { type IService } from "../models/service.model.js";
type CreateServiceInput = {
    name: string;
    shortDescription: string;
    fullDescription: string;
    categoryId: string;
    thumbnailImage: string;
    bannerImage?: string;
};
type UpdateServiceInput = Partial<Pick<IService, "name" | "shortDescription" | "fullDescription" | "thumbnailImage" | "bannerImage">> & {
    categoryId?: string;
};
export declare class ServiceService {
    private static invalidateServiceCache;
    private static invalidatePackageCaches;
    private static buildFullServiceData;
    static createService(payload: CreateServiceInput): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, payload: UpdateServiceInput): Promise<IService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getServiceById(serviceId: string): Promise<IService & {
        _id: Types.ObjectId;
    } & {
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
        servicePricing: (import("../models/servicepricing.model.js").IServicePricing & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    static toggleServiceStatus(serviceId: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        unchanged: boolean;
        service: IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        requiresConfirmation?: never;
        impact?: never;
    } | {
        requiresConfirmation: boolean;
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
            servicePricing: (import("../models/servicepricing.model.js").IServicePricing & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
        };
        success?: never;
        unchanged?: never;
        service?: never;
    } | {
        success: boolean;
        service: IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        unchanged?: never;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static getServicesByLocation(params: {
        cityIds?: string[];
        categoryIds?: string[];
        limit?: number;
        page?: number;
        isActive?: boolean;
        isComplete?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static findServices(params: {
        searchTerm?: string;
        categoryId?: string;
        locationId?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
        isComplete?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (IService & {
            _id: Types.ObjectId;
        } & {
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
            locationId: Types.ObjectId;
            name: string;
            isActive: boolean;
        }[];
    }>;
    static removeServiceLocation(serviceId: string, locationId: string): Promise<{
        success: boolean;
        unchanged: boolean;
        message: string;
        locations: import("../models/service.model.js").ILocationService[];
    } | {
        success: boolean;
        message: string;
        locations: import("../models/service.model.js").ILocationService[];
        unchanged?: never;
    }>;
    static updateServiceTiers(serviceId: string, tiers: {
        tierId: string;
    }[]): Promise<{
        success: boolean;
        unchanged: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
    } | {
        success: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
        unchanged?: never;
    }>;
    static removeServiceTier(serviceId: string, tierId: string): Promise<{
        success: boolean;
        unchanged: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
    } | {
        success: boolean;
        message: string;
        tiers: import("../models/service.model.js").IServiceTier[];
        unchanged?: never;
    }>;
    static getFullService(serviceId: string): Promise<{
        service: {
            id: any;
            name: any;
            shortDescription: any;
            fullDescription: any;
            thumbnailImage: any;
            bannerImage: any;
            startingPrice: any;
            category: {
                id: Types.ObjectId;
                label: string;
                value: string;
                image: string | undefined;
            } | null;
            isActive: any;
            isComplete: any;
            serviceReference: any;
        };
        subServiceComponents: any;
        locations: any;
        tiers: any;
        components: Record<string, {
            tierId: Types.ObjectId;
            components: any[];
        }>;
    }>;
    static getFullServiceAdmin(serviceId: string): Promise<{
        service: {
            id: any;
            name: any;
            shortDescription: any;
            fullDescription: any;
            thumbnailImage: any;
            bannerImage: any;
            startingPrice: any;
            category: {
                id: Types.ObjectId;
                label: string;
                value: string;
                image: string | undefined;
            } | null;
            isActive: any;
            isComplete: any;
            serviceReference: any;
        };
        subServiceComponents: any;
        locations: any;
        tiers: any;
        components: Record<string, {
            tierId: Types.ObjectId;
            components: any[];
        }>;
    }>;
    static getFullServiceByCities(serviceId: string, cityIds: string[]): Promise<{
        service: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string;
            bannerImage: string | undefined;
            startingPrice: number;
            isActive: true;
            isComplete: true;
            serviceReference: string;
        };
        subServiceComponents: unknown[];
        locations: {
            locationDetails: {
                locationId: any;
                locationName: any;
                city: any;
            } | null;
            name: string;
            isActive: boolean;
            locationId: Types.ObjectId;
        }[];
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
    static exportServicesToCsv(serviceIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=service.service.d.ts.map