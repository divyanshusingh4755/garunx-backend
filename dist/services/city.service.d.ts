import { Types } from "mongoose";
import { type ICity, type IGeoPoint } from "../models/city.model.js";
type CityUpdate = Partial<Pick<ICity, "name" | "country" | "image" | "description" | "location"> & {
    stateId?: string;
}>;
export declare class CityService {
    private static invalidateCityCache;
    private static applyStringFilter;
    private static applyObjectIdFilter;
    static createCity(params: {
        name: string;
        country: string;
        stateId: string;
        image?: string;
        description?: string;
        location?: IGeoPoint;
    }): Promise<import("mongoose").Document<unknown, {}, ICity, {}, import("mongoose").DefaultSchemaOptions> & ICity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    static findCity(params: {
        searchTerm?: string;
        cityFilter?: string;
        stateIdFilter?: string;
        countryFilter?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: (ICity & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateCity(cityId: string, updateData: CityUpdate): Promise<ICity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static softDeleteCity(cityId: string, status: boolean): Promise<ICity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getCityById(cityId: string): Promise<ICity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static exportCitiesToCsv(cityIds?: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
export {};
//# sourceMappingURL=city.service.d.ts.map