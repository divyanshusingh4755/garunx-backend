import mongoose, { Types } from "mongoose";
import { type ICategory } from "../models/category.model.js";
export declare class CategoryService {
    static createCategory(categoryData: Partial<ICategory>): Promise<mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCategory(id: string, updateData: Partial<ICategory>): Promise<mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getCategoryById(id: string): Promise<ICategory & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteCategory(id: string): Promise<void>;
    static getDeactivationImpact(categoryId: string): Promise<{
        componentsCount: number;
        servicesCount: number;
        packagesCount: number;
        components: (import("../models/component.model.js").IComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        services: (import("../models/service.model.js").IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        packages: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleCategoryStatus(categoryId: string, confirmed?: boolean): Promise<{
        requiresConfirmation: true;
        impact: {
            componentsCount: number;
            servicesCount: number;
            packagesCount: number;
            components: (import("../models/component.model.js").IComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
            services: (import("../models/service.model.js").IService & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
            packages: (import("../models/package.model.js").IPackage & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
    } | {
        requiresConfirmation: false;
        label: string;
        value: string;
        type: "service" | "product";
        image?: string;
        description?: string;
        isActive: boolean;
        displayOrder: number;
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
        impact?: never;
    }>;
    static findCategories(searchTerm?: string, typeFilter?: "service" | "product", limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ICategory & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=category.service.d.ts.map