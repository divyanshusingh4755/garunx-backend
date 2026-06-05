import { Types } from "mongoose";
import { type IComponent } from "../models/component.model.js";
import mongoose from "mongoose";
export declare class ComponentService {
    static createComponent(payload: Partial<IComponent>): Promise<mongoose.Document<unknown, {}, IComponent, {}, mongoose.DefaultSchemaOptions> & IComponent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponent(componentId: string, updateData: Partial<IComponent>): Promise<mongoose.Document<unknown, {}, IComponent, {}, mongoose.DefaultSchemaOptions> & IComponent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getDeactivationImpact(componentId: string): Promise<{
        affectedServicesCount: number;
        pricingCount: number;
        serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static toggleComponentStatus(componentId: string, isActive: boolean, confirmed?: boolean): Promise<{
        requiresConfirmation: boolean;
        impact: {
            affectedServicesCount: number;
            pricingCount: number;
            serviceComponents: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        success?: never;
        message?: never;
    } | {
        success: boolean;
        message: string;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static getComponentById(componentId: string): Promise<IComponent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static FindComponents(searchTerm?: string, categoryId?: string, limit?: number, page?: number, isRemovable?: boolean, isActive?: boolean, isBundled?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IComponent & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=component.service.d.ts.map