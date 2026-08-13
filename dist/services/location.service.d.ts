import mongoose, { Types } from "mongoose";
import { type ILocation, type IGeoPoint } from "../models/location.model.js";
type LocationUpdate = Partial<Pick<ILocation, "name" | "country" | "fullAddress" | "pincode" | "image" | "description" | "location"> & {
    stateId?: string;
    cityId?: string;
}>;
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
        location?: IGeoPoint;
    }): Promise<mongoose.Document<unknown, {}, ILocation, {}, mongoose.DefaultSchemaOptions> & ILocation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    private static applyStringFilter;
    private static applyObjectIdFilter;
    static findLocation(params: {
        searchTerm?: string;
        countryFilter?: string;
        stateIdFilter?: string;
        cityIdFilter?: string;
        pincodeFilter?: string;
        limit?: number;
        page?: number;
        isActive?: boolean;
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
    static updateLocation(locationId: string, updateData: LocationUpdate): Promise<ILocation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    static getDeactivationImpact(locationId: string): Promise<{
        servicesCount: number;
        packagesCount: number;
        services: (import("../models/service.model.js").IService & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
        packages: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static softDeleteLocation(locationId: string, status: boolean, confirmed?: boolean): Promise<{
        success: boolean;
        unchanged: boolean;
        requiresConfirmation?: never;
        impact?: never;
        location?: never;
    } | {
        requiresConfirmation: boolean;
        impact: {
            servicesCount: number;
            packagesCount: number;
            services: (import("../models/service.model.js").IService & {
                _id: Types.ObjectId;
            } & {
                __v: number;
            })[];
            packages: (import("../models/package.model.js").IPackage & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        success?: never;
        unchanged?: never;
        location?: never;
    } | {
        success: boolean;
        location: ILocation & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        };
        unchanged?: never;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static getLocationById(locationId: string): Promise<ILocation & {
        _id: Types.ObjectId;
    } & {
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
export {};
//# sourceMappingURL=location.service.d.ts.map