import { type IState } from "../models/state.model.js";
export declare class StateService {
    private static applyFilter;
    static createState(state: String, country: String, image?: String, description?: String, location?: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<import("mongoose").Document<unknown, {}, IState, {}, import("mongoose").DefaultSchemaOptions> & IState & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static FindState(searchTerm?: string, countryFilter?: string, stateFilter?: string, limit?: number, page?: number, isActive?: boolean): Promise<{
        data: (IState & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateState(stateId: string, updateData: Partial<IState>): Promise<IState & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static softDeleteState(stateId: string, status: string): Promise<IState & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getStateById(stateId: string): Promise<IState & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=state.service.d.ts.map