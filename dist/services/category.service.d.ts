import mongoose from "mongoose";
import { type ICategory } from "../models/category.model.js";
export declare class CategoryService {
    static createCategory(categoryData: Partial<ICategory>): Promise<mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCategory(id: string, updateData: Partial<ICategory>): Promise<mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static getCategoryById(id: string): Promise<ICategory & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }>;
    static deleteCategory(id: string): Promise<(mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getDeactivationImpact(categoryId: string): Promise<{
        componentsCount: number;
        servicesCount: number;
        packagesCount: number;
        components: (import("../models/component.model.js").IComponent & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        services: (import("../models/service.model.js").IService & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        packages: (import("../models/package.model.js").IPackage & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleCategoryStatus(categoryId: string, confirmed?: boolean): Promise<(ICategory & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }) | {
        requiresConfirmation: boolean;
        impact: {
            componentsCount: number;
            servicesCount: number;
            packagesCount: number;
            components: (import("../models/component.model.js").IComponent & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
            services: (import("../models/service.model.js").IService & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
            packages: (import("../models/package.model.js").IPackage & Required<{
                _id: mongoose.Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
    } | null>;
    static FindCategories(searchTerm?: string, typeFilter?: "service" | "product", limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ICategory & {
            _id: mongoose.Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=category.service.d.ts.map