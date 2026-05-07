import { Types } from "mongoose";
import { type ILocation } from "../models/location.model.js";
export declare class LocationService {
    static createLocation(data: {
        name: string;
        country: string;
        stateId: string;
        cityId: string;
        fullAddress: string;
        pincode: string;
        image?: string;
        description?: string;
        location?: {
            type: "Point";
            coordinates: [number, number];
        };
    }): Promise<import("mongoose").Document<unknown, {}, ILocation, {}, import("mongoose").DefaultSchemaOptions> & ILocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    private static applyFilter;
    static FindLocation(params: {
        searchTerm?: string;
        countryFilter?: string;
        stateIdFilter?: string;
        cityIdFilter?: string;
        pincodeFilter?: string;
        limit?: number;
        page?: number;
        isActive?: boolean | undefined;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{
        data: {
            id: any;
            name: any;
            country: any;
            state: {
                id: any;
                name: any;
            };
            city: {
                id: any;
                name: any;
            };
            pincode: any;
            fullAddress: any;
            isActive: any;
            image: any;
            description: any;
            location: any;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateLocation(locationId: string, updateData: {
        name?: string;
        country?: string;
        stateId?: string;
        cityId?: string;
        fullAddress?: string;
        pincode?: string;
        image?: string;
        description?: string;
        location?: {
            type: "Point";
            coordinates: [number, number];
        };
        isActive?: boolean;
    }): Promise<ILocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static softDeleteLocation(locationId: string, status: string): Promise<ILocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getLocationById(locationId: string): Promise<ILocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getLocationByIds(locationIds: string[]): Promise<{
        id: any;
        name: any;
        country: any;
        state: {
            id: any;
            name: any;
        };
        city: {
            id: any;
            name: any;
        };
        pincode: any;
        fullAddress: any;
        isActive: any;
        image: any;
        description: any;
        location: any;
    }[]>;
}
//# sourceMappingURL=location.service.d.ts.map