import { Types } from "mongoose";
import { type ITaxProfile, type TaxTreatment } from "../models/tax-profile.model.js";
export interface CreateTaxProfilePayload {
    name: string;
    code: string;
    treatment: TaxTreatment;
    totalRate: number;
    description?: string;
    createdBy?: string | Types.ObjectId;
}
export interface UpdateTaxProfilePayload {
    name?: string;
    treatment?: TaxTreatment;
    totalRate?: number;
    description?: string | null;
    updatedBy?: string | Types.ObjectId;
}
export interface TaxProfileFilters {
    search?: string;
    treatment?: TaxTreatment;
    isActive?: boolean;
    page?: number;
    limit?: number;
}
export declare class TaxProfileService {
    private static getTaxProfileUsage;
    private static validateObjectId;
    private static normalizeOptionalString;
    static createTaxProfile(payload: CreateTaxProfilePayload): Promise<ITaxProfile>;
    static getTaxProfiles(filters?: TaxProfileFilters): Promise<{
        data: (ITaxProfile & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    static getActiveTaxProfiles(): Promise<(ITaxProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getTaxProfileById(taxProfileId: string): Promise<ITaxProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateTaxProfile(taxProfileId: string, payload: UpdateTaxProfilePayload): Promise<import("mongoose").Document<unknown, {}, ITaxProfile, {}, import("mongoose").DefaultSchemaOptions> & ITaxProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTaxProfileStatus(taxProfileId: string, isActive: boolean, updatedBy?: string | Types.ObjectId): Promise<(import("mongoose").Document<unknown, {}, ITaxProfile, {}, import("mongoose").DefaultSchemaOptions> & ITaxProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | {
        success: boolean;
        message: string;
        usage: {
            services: {
                serviceId: string;
                serviceName: string;
                pricingCount: number;
            }[];
            packages: {
                packageId: string;
                packageName: string;
                pricingCount: number;
            }[];
            summary: {
                servicePricingCount: number;
                packagePricingCount: number;
                affectedServiceCount: number;
                affectedPackageCount: number;
            };
        };
    }>;
}
//# sourceMappingURL=taxprofile.service.d.ts.map