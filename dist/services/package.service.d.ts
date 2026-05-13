import { Types } from "mongoose";
import { type IService } from "../models/service.model.js";
export declare class PackageService {
    static extractVariantIds(service: IService): string[];
    static validateServices(serviceIds: string[]): Promise<(import("mongoose").Document<unknown, {}, IService, {}, import("mongoose").DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static createPackage(payload: {
        name: string;
        description?: string;
        image?: string;
        services: {
            serviceId: string;
            displayOrder: number;
        }[];
        locations?: string[];
        pricing?: {
            type?: "DERIVED" | "FIXED";
            fixedPrice?: number;
            discountPercentage?: number;
        };
        category: string;
        createdBy?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePackage(packageId: string, updateData: {
        name?: string;
        description?: string;
        image?: string;
        services?: string[];
        locations?: string[];
        pricing?: {
            type?: "DERIVED" | "FIXED";
            fixedPrice?: number;
            discountPercentage?: number;
        };
        category: string;
        isActive?: boolean;
        displayOrder?: number;
    }): Promise<(import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getPackageDetails(packageId: string, location: string): Promise<{
        services: never[];
        name: string;
        shortDescription?: string;
        description?: string;
        packageReference: string;
        categoryId: Types.ObjectId;
        locations: Types.ObjectId[];
        image?: string;
        pricing: {
            type: "DERIVED" | "FIXED";
            fixedPrice?: number;
            discountPercentage?: number;
        };
        displayOrder?: number;
        isActive: boolean;
        version: number;
        createdBy?: Types.ObjectId;
        _id: Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
    }>;
    static updatePackageStatus(packageId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    static getPackageById(packageId: string, isActive?: boolean): Promise<import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getFullPackageDetails(serviceIds: string[]): Promise<void>;
    static getPackages({ search, category, serviceId, location, isActive, page, limit, sortBy, sortOrder, }: {
        search?: string;
        category?: string;
        serviceId?: string;
        location?: string;
        isActive?: boolean | undefined;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: {
            computedPricing: import("./pricing.service.js").PriceBreakdown;
            name: string;
            shortDescription?: string;
            description?: string;
            packageReference: string;
            categoryId: Types.ObjectId;
            services: import("../models/package.model.js").IPackageService[];
            locations: Types.ObjectId[];
            image?: string;
            pricing: {
                type: "DERIVED" | "FIXED";
                fixedPrice?: number;
                discountPercentage?: number;
            };
            displayOrder?: number;
            isActive: boolean;
            version: number;
            createdBy?: Types.ObjectId;
            _id: Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=package.service.d.ts.map