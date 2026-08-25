import mongoose, { Types } from "mongoose";
import { type ITaxProfile } from "../models/tax-profile.model.js";
import type { TaxTreatment } from "../types/tax.types.js";
export interface CreateTaxProfilePayload {
    name: string;
    code: string;
    treatment: TaxTreatment;
    totalRate: number;
    description?: string | null;
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
    private static invalidateTaxProfileCache;
    private static invalidateDependentPricingCaches;
    private static validateObjectId;
    private static toObjectId;
    private static normalizeOptionalString;
    private static validateTreatmentRate;
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
    static updateTaxProfile(taxProfileId: string, payload: UpdateTaxProfilePayload): Promise<mongoose.Document<unknown, {}, ITaxProfile, {}, mongoose.DefaultSchemaOptions> & ITaxProfile & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateTaxProfileStatus(taxProfileId: string, isActive: boolean, updatedBy?: string | Types.ObjectId): Promise<never>;
    static exportTaxProfilesToCsv(taxProfileIds: string[]): Promise<{
        csv: string;
        total: number;
    }>;
}
//# sourceMappingURL=taxprofile.service.d.ts.map