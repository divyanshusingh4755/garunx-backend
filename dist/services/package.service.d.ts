import { Types } from "mongoose";
export declare class PackageService {
    static createPackage(payload: any): Promise<import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePackage(packageId: string, payload: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getPackageById(packageId: string): Promise<import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static togglePackageStatus(packageId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    static findPackages(searchTerm?: string, categoryId?: string, locationId?: string, limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updatePackageLocations(packageId: string, locations: {
        locationId: string;
    }[]): Promise<{
        success: boolean;
        message: string;
        locations: import("../models/package.model.js").IPackageLocation[];
    }>;
    static removePackageLocation(packageId: string, locationId: string): Promise<{
        success: boolean;
        message: string;
        locations: import("../models/package.model.js").IPackageLocation[];
    }>;
    static updatePackageTiers(packageId: string, tiers: {
        tierId: string;
    }[]): Promise<{
        success: boolean;
        message: string;
        tiers: import("../models/package.model.js").IPackageTier[];
    }>;
    static removePackageTier(packageId: string, tierId: string): Promise<{
        success: boolean;
        message: string;
        tiers?: never;
    } | {
        success: boolean;
        message: string;
        tiers: import("../models/package.model.js").IPackageTier[];
    }>;
    static getFullPackage(packageId: string): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string | undefined;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            isActive: boolean;
            isComplete: boolean;
            packageReference: string;
        };
        locations: import("../models/package.model.js").IPackageLocation[];
        tiers: {
            tierId: any;
            name: any;
        }[];
        services: Record<string, any>;
    }>;
    static getRelatedPackageService(packageId: string, tierId: string, locationId: string): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string | undefined;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            isActive: boolean;
            isComplete: boolean;
            packageReference: string;
        };
        locations: import("../models/package.model.js").IPackageLocation[];
        tiers: {
            tierId: any;
            name: any;
        }[];
        relatedServices: {
            serviceId: Types.ObjectId;
            name: string;
            isRequired: boolean;
            isRelated: boolean;
            thumbnailImage: any;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            pricing: {
                locationId: Types.ObjectId;
                basePrice: number;
                fixedPrice: number | undefined;
                discountPercent: number | undefined;
                finalPrice: number;
            } | null;
        }[];
    }>;
    static updatePackageStartingPrice(packageId: string): Promise<void>;
    static validatePackageConfiguration(packageId: string): Promise<{
        isComplete: boolean;
        issues: string[];
    }>;
    static getFullPackageByCities(packageId: string, cityIds: string[]): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string | undefined;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            isActive: boolean;
            isComplete: boolean;
            packageReference: string;
        };
        locations: any[];
        tiers: {
            tierId: Types.ObjectId;
            name: string;
        }[];
        components: Record<string, any>;
    }>;
    static getPackagesByLocation(cityIds: string[], limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=package.service.d.ts.map