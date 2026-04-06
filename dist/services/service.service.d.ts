import mongoose, { Types } from 'mongoose';
import { type IService } from '../models/service.model.js';
export declare class ServiceService {
    static createService(payload: Partial<IService>): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, updateData: any): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deleteService(serviceId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceById(serviceId: string): Promise<any[]>;
    static addSubService(serviceId: string, payload: {
        name: string;
        slug: string;
        description?: string;
        displayOrder?: number;
    }): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSubService(serviceId: string, subServiceId: string, updateData: {
        name?: string;
        slug?: string;
        description?: string;
        displayOrder?: number;
    }): Promise<(mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static deleteSubService(serviceId: string, subServiceId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static addProductsToSubService(serviceId: string, subServiceId: string, variantIds: string[]): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static removeProductFromSubService(serviceId: string, subServiceId: string, variantId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceWithProducts(serviceId: string, location: string): Promise<{
        subServices: {
            products: any[];
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
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }>;
    static FindServices(searchTerm?: string, locationFilter?: string, categoryFilter?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        data: (IService & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getServicesByFilters(categories?: string | string[], locations?: string | string[], page?: number, limit?: number): Promise<{
        services: IService[];
        total: number;
    }>;
}
//# sourceMappingURL=service.service.d.ts.map