import { Types } from "mongoose";
import { type IComponent } from "../models/component.model.js";
export declare class ComponentService {
    static createComponent(payload: Partial<IComponent>): Promise<import("mongoose").Document<unknown, {}, IComponent, {}, import("mongoose").DefaultSchemaOptions> & IComponent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateComponent(componentId: string, updateData: Partial<IComponent>): Promise<import("mongoose").Document<unknown, {}, IComponent, {}, import("mongoose").DefaultSchemaOptions> & IComponent & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleComponentStatus(componentId: string, isActive: boolean): Promise<{
        success: boolean;
        message: string;
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