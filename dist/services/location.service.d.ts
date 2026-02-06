import { type ILocation } from "../models/location.model.js";
export declare class LocationService {
    static createLocation(country: String, state: String, city: String, fullAddress: String, pincode: String, image?: String, description?: String, location?: {
        type: "Point";
        coordinates: [number, number];
    }): Promise<import("mongoose").Document<unknown, {}, ILocation, {}, import("mongoose").DefaultSchemaOptions> & ILocation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static FindLocation(searchTerm?: string, countryFilter?: string, stateFilter?: string, cityFilter?: string, pincodeFilter?: string, limit?: number, page?: number): Promise<{
        data: (ILocation & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static updateLocation(locationId: string, updateData: Partial<ILocation>): Promise<ILocation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static softDeleteLocation(locationId: string): Promise<ILocation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getLocationById(locationId: string): Promise<ILocation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=location.service.d.ts.map