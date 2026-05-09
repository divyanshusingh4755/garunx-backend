import { type ISubServiceComponent } from "../models/subservices.model.js";
export declare class SubServiceComponentService {
    private static applyFilter;
    static createSubServiceComponent(name: string, description: string, serviceId: string, image?: string, isActive?: boolean): Promise<import("mongoose").Document<unknown, {}, ISubServiceComponent, {}, import("mongoose").DefaultSchemaOptions> & ISubServiceComponent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findSubServiceComponents(searchTerm?: string, serviceId?: string, limit?: number, page?: number, isActive?: boolean, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ISubServiceComponent & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateSubServiceComponent(subServiceComponentId: string, updateData: Partial<ISubServiceComponent>): Promise<ISubServiceComponent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static toggleSubServiceComponent(subServiceComponentId: string, status: boolean): Promise<ISubServiceComponent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getSubServiceComponentById(subServiceComponentId: string): Promise<ISubServiceComponent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=subservices.service.d.ts.map