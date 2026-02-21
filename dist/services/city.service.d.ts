import { type ICity } from "../models/city.model.js";
export declare class CityService {
    private static applyFilter;
    static createCity(state: String, city: String, image?: String, description?: String, location?: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<import("mongoose").Document<unknown, {}, ICity, {}, import("mongoose").DefaultSchemaOptions> & ICity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static FindCity(searchTerm?: string, cityFilter?: string, stateFilter?: string, limit?: number, page?: number, isActive?: boolean): Promise<{
        data: (ICity & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateCity(cityId: string, updateData: Partial<ICity>): Promise<ICity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static softDeleteCity(cityId: string, status: string): Promise<ICity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getCityById(cityId: string): Promise<ICity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=city.service.d.ts.map