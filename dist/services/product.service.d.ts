import { Types } from "mongoose";
import { type IProduct } from "../models/product.model.js";
export declare class ProductService {
    static createProduct(payload: Partial<IProduct>): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateProduct(productId: string, updateData: Partial<IProduct>): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateProductStatus(productId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    static getProductById(productId: string): Promise<IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static FindProducts(searchTerm?: string, categoryFilter?: string, locationFilter?: string, tierFilter?: string, limit?: number, page?: number, isRemovable?: boolean, isActive?: boolean, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        data: {
            variants: import("../models/product.model.js").IVariant[];
            name: string;
            isRemovable: boolean;
            categoryName: string;
            description: string;
            imageUrl?: string;
            adminNotes?: string;
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
        total: number;
        page: number;
        totalPages: number;
    }>;
    static addVariant(productId: string, variant: {
        location: string;
        tier: string;
        price: number;
        description?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateVariant(productId: string, variantId: string, updateData: any): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleVariantStatus(productId: string, variantId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    static getProductForUser(productId: string, location: string): Promise<{
        _id: Types.ObjectId;
        name: string;
        categoryName: string;
        isRemovable: boolean;
        variants: import("../models/product.model.js").IVariant[];
    }>;
    static getProductsByLocation(location: string): Promise<{
        _id: Types.ObjectId;
        name: string;
        categoryName: string;
        isRemovable: boolean;
        variants: import("../models/product.model.js").IVariant[];
    }[]>;
    static getVariantsByLocationFromId(variantId: string): Promise<any>;
}
//# sourceMappingURL=product.service.d.ts.map