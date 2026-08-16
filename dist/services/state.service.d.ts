import { type IState, type IGeoPoint } from "../models/state.model.js";
type StateUpdate = Partial<Pick<IState, "country" | "name" | "gstCode" | "image" | "description" | "location">>;
export declare class StateService {
    private static invalidateStateCache;
    private static applyFilter;
    static createState(params: {
        name: string;
        country: string;
        gstCode: string;
        image?: string;
        description?: string;
        location?: IGeoPoint;
    }): Promise<import("mongoose").Document<unknown, {}, IState, {}, import("mongoose").DefaultSchemaOptions> & IState & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static findState(params: {
        searchTerm?: string;
        countryFilter?: string;
        stateFilter?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (IState & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateState(stateId: string, updateData: StateUpdate): Promise<IState & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    static softDeleteState(stateId: string, status: boolean): Promise<IState & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getStateById(stateId: string): Promise<IState & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    static exportStatesToCsv(params: {
        exportAll?: boolean;
        stateIds?: string[];
    }): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=state.service.d.ts.map