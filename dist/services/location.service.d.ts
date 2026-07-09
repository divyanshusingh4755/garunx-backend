import mongoose, { Types } from "mongoose";
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
    }): Promise<mongoose.Document<unknown, {}, import("../models/location.model.js").ILocation, {}, mongoose.DefaultSchemaOptions> & import("../models/location.model.js").ILocation & Required<{
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
    }): Promise<import("../models/location.model.js").ILocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getDeactivationImpact(locationId: string): Promise<{
        servicesCount: number;
        packagesCount: number;
        services: (import("../models/service.model.js").IService & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        packages: (import("../models/package.model.js").IPackage & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static softDeleteLocation(locationId: string, status: boolean, confirmed?: boolean): Promise<{
        requiresConfirmation: boolean;
        impact: {
            servicesCount: number;
            packagesCount: number;
            services: (import("../models/service.model.js").IService & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
            packages: (import("../models/package.model.js").IPackage & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        success?: never;
    } | {
        success: boolean;
        requiresConfirmation?: never;
        impact?: never;
    }>;
    static getLocationById(locationId: string): Promise<import("../models/location.model.js").ILocation & Required<{
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