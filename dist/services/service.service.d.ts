import mongoose from 'mongoose';
import { type IService } from '../models/service.model.js';
export declare class ServiceService {
    static createService(payload: Partial<IService>): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateService(serviceId: string, updateData: any): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deleteService(serviceId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceById(serviceId: string): Promise<IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static addSubService(serviceId: string, payload: {
        name: string;
        slug: string;
        description?: string;
        displayOrder?: number;
    }): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateSubService(serviceId: string, subServiceId: string, updateData: any): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deleteSubService(serviceId: string, subServiceId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static addProductsToSubService(serviceId: string, subServiceId: string, productIds: string[]): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static removeProductFromSubService(serviceId: string, subServiceId: string, productId: string): Promise<mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getServiceWithProducts(serviceId: string, location: string): Promise<{
        subServices: {
            productIds: any[];
            name: string;
            slug: string;
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
        _id: mongoose.Types.ObjectId;
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
    static getAllService(location?: string): Promise<(IService & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
//# sourceMappingURL=service.service.d.ts.map