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
    static deleteProduct(productId: string): Promise<{
        success: boolean;
    }>;
    static getProductById(productId: string): Promise<IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static FindProducts(searchTerm?: string, categoryFilter?: string, locationFilter?: string, tierFilter?: string, limit?: number, page?: number, isRemovable?: boolean, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        data: (IProduct & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
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
    static deleteVariant(productId: string, variantId: string): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getProductForUser(productId: string, location: string): Promise<{
        variants: import("../models/product.model.js").IVariant[];
        name: string;
        isRemovable: boolean;
        categoryName: string;
        description: string;
        imageUrl?: string;
        adminNotes?: string;
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
    static getProductsByLocation(location: string): Promise<(IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getVariantsByLocationFromId(variantId: string): Promise<any>;
}
//# sourceMappingURL=product.service.d.ts.map