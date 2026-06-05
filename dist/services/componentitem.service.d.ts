import mongoose from "mongoose";
import { type IComponentItem } from "../models/componentitem.model.js";
import { Types } from "mongoose";
export declare class ComponentItemService {
    static createComponentItem(payload: Partial<IComponentItem>): Promise<mongoose.Document<unknown, {}, IComponentItem, {}, mongoose.DefaultSchemaOptions> & IComponentItem & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponentItem(componentItemId: string, updateData: Partial<IComponentItem>): Promise<mongoose.Document<unknown, {}, IComponentItem, {}, mongoose.DefaultSchemaOptions> & IComponentItem & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getComponentItemById(componentItemId: string): Promise<mongoose.Document<unknown, {}, IComponentItem, {}, mongoose.DefaultSchemaOptions> & IComponentItem & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getAllComponentItems(searchTerm?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IComponentItem & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getDeactivationImpact(componentItemId: string): Promise<{
        affectedServiceComponentsCount: number;
        affected: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static updateComponentItemStatus(componentItemId: string, isActive: boolean, confirmed?: boolean): Promise<{
        requiresConfirmation: boolean;
        impact: {
            affectedServiceComponentsCount: number;
            affected: (import("../models/servicecomponent.model.js").IServiceComponent & Required<{
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
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.d.ts.map