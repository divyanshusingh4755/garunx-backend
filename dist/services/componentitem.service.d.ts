import { Types } from "mongoose";
import { type IComponentItem } from "../models/componentitem.model.js";
type CreateComponentItemInput = {
    name: string;
    price?: number;
    isActive?: boolean;
};
type ComponentItemUpdate = Partial<Pick<IComponentItem, "name" | "price">>;
export declare class ComponentItemService {
    private static invalidateComponentItemCache;
    private static invalidateAffectedServiceCaches;
    static createComponentItem(payload: CreateComponentItemInput): Promise<import("mongoose").Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponentItem(componentItemId: string, updateData: ComponentItemUpdate): Promise<IComponentItem & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getComponentItemById(componentItemId: string): Promise<IComponentItem & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getAllComponentItems(params: {
        searchTerm?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (IComponentItem & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static getDeactivationImpact(componentItemId: string): Promise<{
        affectedServiceComponentsCount: number;
        affected: (import("../models/servicecomponent.model.js").IServiceComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    static updateComponentItemStatus(componentItemId: string, isActive: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        unchanged: boolean;
        componentItem: IComponentItem & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        requiresConfirmation?: never;
        impact?: never;
    } | {
        requiresConfirmation: boolean;
        impact: {
            affectedServiceComponentsCount: number;
            affected: (import("../models/servicecomponent.model.js").IServiceComponent & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
        };
        success?: never;
        unchanged?: never;
        componentItem?: never;
    } | {
        success: boolean;
        componentItem: IComponentItem & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        unchanged?: never;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static exportComponentItemsToCsv(componentItemIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.d.ts.map