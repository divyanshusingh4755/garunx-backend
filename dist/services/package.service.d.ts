import { Types } from "mongoose";
export declare class PackageService {
    static validateServices(serviceIds: string[]): Promise<(import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    static createPackage(payload: {
        name: string;
        slug: string;
        description?: string;
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
        services?: string[];
        locations?: string[];
        pricing?: {
            type?: "DERIVED" | "FIXED";
            fixedPrice?: number;
            discountPercentage?: number;
        };
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
        services: {
            subServices: {
                productIds: any[];
                name: string;
                slug: string;
                description?: string;
                displayOrder: number;
                variantIds: Types.ObjectId[];
            }[];
            name: string;
            locations: string[];
            shortDescription: string;
            fullDescription?: string;
            category: string;
            thumbnailImage?: string;
            bannerImage?: string;
            isActive: boolean;
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
        name: string;
        slug: string;
        description?: string;
        locations?: string[];
        pricing: {
            type: "DERIVED" | "FIXED";
            fixedPrice?: number;
            discountPercentage?: number;
        };
        displayOrder?: number;
        isActive: boolean;
        createdBy?: Types.ObjectId;
        version: number;
        isDeleted: boolean;
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
    static deletePackage(packageId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updatePackageStatus(packageId: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/package.model.js").IPackage, {}, import("mongoose").DefaultSchemaOptions> & import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getPackageById(packageId: string): Promise<import("../models/package.model.js").IPackage & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getPackages({ search, serviceId, location, isActive, page, limit, sortBy, sortOrder }: {
        search?: string;
        serviceId?: string;
        location?: string;
        isActive?: boolean;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=package.service.d.ts.map