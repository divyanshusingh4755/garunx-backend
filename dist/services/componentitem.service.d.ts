import { type IComponentItem } from "../models/componentitem.model.js";
export declare class ComponentItemService {
    static createComponentItem(payload: Partial<IComponentItem>): Promise<import("mongoose").Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponentItem(componentItemId: string, updateData: Partial<IComponentItem>): Promise<import("mongoose").Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getComponentItemById(componentItemId: string): Promise<import("mongoose").Document<unknown, {}, IComponentItem, {}, import("mongoose").DefaultSchemaOptions> & IComponentItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getAllComponentItems(searchTerm?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (IComponentItem & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateComponentItemStatus(componentItemId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
}
export default ComponentItemService;
//# sourceMappingURL=componentitem.service.d.ts.map