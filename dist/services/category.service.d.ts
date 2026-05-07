import { type ICategory } from "../models/category.model.js";
export declare class CategoryService {
    static createCategory(categoryData: Partial<ICategory>): Promise<import("mongoose").Document<unknown, {}, ICategory, {}, import("mongoose").DefaultSchemaOptions> & ICategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCategory(id: string, updateData: Partial<ICategory>): Promise<import("mongoose").Document<unknown, {}, ICategory, {}, import("mongoose").DefaultSchemaOptions> & ICategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getCategoryById(id: string): Promise<ICategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    static deleteCategory(id: string): Promise<(import("mongoose").Document<unknown, {}, ICategory, {}, import("mongoose").DefaultSchemaOptions> & ICategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static toggleCategoryStatus(id: string): Promise<import("mongoose").Document<unknown, {}, ICategory, {}, import("mongoose").DefaultSchemaOptions> & ICategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static FindCategories(searchTerm?: string, typeFilter?: "service" | "product", limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ICategory & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=category.service.d.ts.map