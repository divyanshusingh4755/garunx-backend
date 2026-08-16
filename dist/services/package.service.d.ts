import { Types } from "mongoose";
import mongoose from "mongoose";
export declare class PackageService {
    private static invalidatePackageCache;
    private static buildFullPackageData;
    static createPackage(payload: any): Promise<mongoose.Document<unknown, {}, import("../models/package.model.js").IPackage, {}, mongoose.DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePackage(packageId: string, payload: any): Promise<(mongoose.Document<unknown, {}, import("../models/package.model.js").IPackage, {}, mongoose.DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
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
    static findPackages(searchTerm?: string, categoryId?: string, locationId?: string, tierId?: string, limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
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
        locations: any[];
    }>;
    static removePackageLocation(packageId: string, locationId: string): Promise<{
        success: boolean;
        message: string;
        locations: any[];
    }>;
    static updatePackageTiers(packageId: string, tiers: {
        tierId: string;
    }[]): Promise<{
        success: boolean;
        message: string;
        tiers: any[];
    }>;
    static removePackageTier(packageId: string, tierId: string): Promise<{
        success: boolean;
        message: string;
        tiers: any[];
    }>;
    static getFullPackage(packageId: string): Promise<{
        package: {
            id: any;
            name: any;
            shortDescription: any;
            fullDescription: any;
            thumbnailImage: any;
            bannerImage: any;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            isActive: any;
            isComplete: any;
            packageReference: any;
            startingPrice: any;
        };
        locations: any;
        tiers: any;
        services: Record<string, {
            tierId: Types.ObjectId;
            services: any[];
        }>;
    }>;
    static getFullPackageAdmin(packageId: string): Promise<{
        package: {
            id: any;
            name: any;
            shortDescription: any;
            fullDescription: any;
            thumbnailImage: any;
            bannerImage: any;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            isActive: any;
            isComplete: any;
            packageReference: any;
            startingPrice: any;
        };
        locations: any;
        tiers: any;
        services: Record<string, {
            tierId: Types.ObjectId;
            services: any[];
        }>;
    }>;
    static getRelatedPackageService(packageId: string, tierId: string, locationId: string): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string;
            bannerImage: string | undefined;
            category: {
                id: any;
                label: any;
                value: any;
                image: any;
            } | null;
            isActive: true;
            isComplete: true;
            packageReference: string;
            startingPrice: number;
        };
        location: {
            locationId: Types.ObjectId;
            name: string;
        };
        tier: {
            tierId: Types.ObjectId;
            name: string;
        };
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
                fixedPrice: number | null | undefined;
                discountPercent: number | null | undefined;
                finalPrice: number;
            } | null;
        }[];
    }>;
    static validatePackageConfiguration(packageId: string): Promise<{
        isComplete: boolean;
        issues: string[];
    }>;
    static getFullPackageByCities(packageId: string, cityIds: string[]): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string;
            bannerImage: string | undefined;
            isActive: true;
            isComplete: true;
            packageReference: string;
            startingPrice: number;
        };
        locations: any[];
        tiers: {
            tierId: Types.ObjectId;
            name: string;
        }[];
        components: Record<string, any>;
    }>;
    static getPackagesByLocation(cityIds?: string[], categoryIds?: string[], limit?: number, page?: number, isActive?: boolean, isComplete?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static exportPackagesToCsv(packageIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
//# sourceMappingURL=package.service.d.ts.map