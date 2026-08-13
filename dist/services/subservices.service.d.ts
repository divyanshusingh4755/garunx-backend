import { Types } from "mongoose";
import { type ISubServiceComponent } from "../models/subservices.model.js";
type CreateSubServiceComponentInput = {
    name: string;
    description: string;
    serviceId: string;
    image?: string;
    isActive?: boolean;
};
type UpdateSubServiceComponentInput = Partial<Pick<ISubServiceComponent, "name" | "description" | "image">> & {
    serviceId?: string;
};
export declare class SubServiceComponentService {
    private static applyServiceFilter;
    static createSubServiceComponent(payload: CreateSubServiceComponentInput): Promise<import("mongoose").Document<unknown, {}, ISubServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & ISubServiceComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static findSubServiceComponents(params: {
        searchTerm?: string;
        serviceId?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (ISubServiceComponent & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateSubServiceComponent(subServiceComponentId: string, updateData: UpdateSubServiceComponentInput): Promise<ISubServiceComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static toggleSubServiceComponent(subServiceComponentId: string, status: boolean): Promise<(ISubServiceComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }) | {
        unchanged: boolean;
        name: string;
        description: string;
        serviceId: Types.ObjectId;
        image?: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        _id: Types.ObjectId;
        __v: number;
    }>;
    static getSubServiceComponentById(subServiceComponentId: string): Promise<ISubServiceComponent & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=subservices.service.d.ts.map