import mongoose, { Types } from "mongoose";
import { type IComponent } from "../models/component.model.js";
type CreateComponentInput = {
    name: string;
    categoryId: string;
    description: string;
    imageUrl?: string;
    isRemovable?: boolean;
    isBundled?: boolean;
    isActive?: boolean;
};
type ComponentUpdate = Partial<Pick<IComponent, "name" | "description" | "imageUrl" | "isBundled" | "isRemovable"> & {
    categoryId?: string;
}>;
export declare class ComponentService {
    static createComponent(payload: CreateComponentInput): Promise<mongoose.Document<unknown, {}, IComponent, {}, mongoose.DefaultSchemaOptions> & IComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponent(componentId: string, updateData: ComponentUpdate): Promise<IComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getDeactivationImpact(componentId: string): Promise<{
        affectedServicesCount: number;
        pricingCount: number;
        serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    static toggleComponentStatus(componentId: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        unchanged: boolean;
        component: IComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        requiresConfirmation?: never;
        impact?: never;
    } | {
        requiresConfirmation: boolean;
        impact: {
            affectedServicesCount: number;
            pricingCount: number;
            serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
        };
        success?: never;
        unchanged?: never;
        component?: never;
    } | {
        success: boolean;
        component: IComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        unchanged?: never;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static getComponentById(componentId: string): Promise<IComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static findComponents(params: {
        searchTerm?: string;
        categoryId?: string;
        limit?: number;
        page?: number;
        isRemovable?: boolean;
        isActive?: boolean;
        isBundled?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (IComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
export {};
//# sourceMappingURL=component.service.d.ts.map