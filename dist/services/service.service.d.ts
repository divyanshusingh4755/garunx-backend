import { Types } from 'mongoose';
export declare class ServiceService {
    static createService(payload: {
        name: string;
        shortDescription: string;
        fullDescription: string;
        category: string;
        locations: string[];
        thumbnailImage: string;
        bannerImage?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, updateData: {
        name?: string;
        shortDescription?: string;
        fullDescription?: string;
        category?: string;
        locations?: string[];
        thumbnailImage?: string;
        bannerImage?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleServiceStatus(serviceId: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceById(serviceId: string): Promise<{
        subServices: {
            variants: any[];
            _id: Types.ObjectId;
            name: string;
            description?: string;
            displayOrder: number;
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
    }>;
    static addSubService(serviceId: string, payload: {
        name: string;
        description?: string;
        displayOrder?: number;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSubService(serviceId: string, subServiceId: string, updateData: {
        name?: string;
        description?: string;
        displayOrder?: number;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleSubServiceStatus(serviceId: string, subServiceId: string, isActive: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static addVariantsToSubService(serviceId: string, subServiceId: string, variants: {
        variantId: string;
        isOptional?: boolean;
        isEditable?: boolean;
        displayOrder?: number;
    }[]): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateVariantInSubService(serviceId: string, subServiceId: string, variantId: string, updateData: {
        isOptional?: boolean;
        isEditable?: boolean;
        displayOrder?: number;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static removeVariantFromSubService(serviceId: string, subServiceId: string, variantId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/service.model.js").IService, {}, import("mongoose").DefaultSchemaOptions> & import("../models/service.model.js").IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceWithProducts(serviceId: string, location: string): Promise<{
        subServices: {
            products: any[];
            _id: Types.ObjectId;
            name: string;
            description?: string;
            displayOrder: number;
            variants: import("../models/service.model.js").ISubServiceVariant[];
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
    }>;
    static FindServices(searchTerm?: string, locationFilter?: string, categoryFilter?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        data: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getServicesByFilters(categories?: string | string[], locations?: string | string[], page?: number, limit?: number): Promise<{
        services: any[];
        total: number;
    }>;
}
//# sourceMappingURL=service.service.d.ts.map