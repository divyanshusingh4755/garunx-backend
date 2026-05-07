import { Types } from "mongoose";
export declare class ServiceService {
    static createService(payload: any): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, payload: any): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
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
    static toggleServiceStatus(serviceId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    static FindServices(searchTerm?: string, categoryId?: string, limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
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
            fullDescription: string | undefined;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            isActive: boolean;
            serviceReference: string;
        };
        locations: import("../models/service.model.js").ILocationService[];
        tiers: {
            tierId: Types.ObjectId;
            name: string;
        }[];
        components: Record<string, any>;
    }>;
    static updateServiceStartingPrice(serviceId: string): Promise<void>;
    static getRuntimeServices({ categoryId, locationId, searchTerm, page, limit, sortBy, sortOrder, }: any): Promise<{
        services: {
            id: any;
            name: any;
            shortDescription: any;
            thumbnailImage: any;
            bannerImage: any;
            startingPrice: any;
            serviceReference: any;
            locations: any;
            tiers: any;
        }[];
        total: number;
        page: any;
        totalPages: number;
    }>;
    static validateServiceConfiguration(serviceId: string): Promise<{
        isComplete: boolean;
        issues: string[];
    }>;
}
//# sourceMappingURL=service.service.d.ts.map