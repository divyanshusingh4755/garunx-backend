import mongoose, { Types } from "mongoose";
import { type IPackageTierService } from "../models/packagetiermap.model.js";
type MappingPayload = {
    packageId: string;
    tierId: string;
    services: Array<{
        serviceId: string;
        isRequired?: boolean;
        isRelated?: boolean;
    }>;
};
export declare class PackageTierMapService {
    private static validateAndFormatServices;
    private static validatePackageTier;
    static bulkUpsertMappings(payload: MappingPayload): Promise<{
        success: boolean;
        message: string;
        data: mongoose.Document<unknown, {}, import("../models/packagetiermap.model.js").IPackageTierMap, {}, mongoose.DefaultSchemaOptions> & import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
    }>;
    static replaceMappings(payload: MappingPayload): Promise<{
        success: boolean;
        message: string;
        data: mongoose.Document<unknown, {}, import("../models/packagetiermap.model.js").IPackageTierMap, {}, mongoose.DefaultSchemaOptions> & import("../models/packagetiermap.model.js").IPackageTierMap & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
    }>;
    static getServicesByPackageAndTier(packageId: string, tierId: string): Promise<{
        serviceId: Types.ObjectId;
        name: string;
        isRequired: boolean;
        isRelated: boolean;
    }[]>;
    static patchService(payload: {
        packageId: string;
        tierId: string;
        serviceId: string;
        isRequired?: boolean;
        isRelated?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        data: IPackageTierService;
    }>;
}
export {};
//# sourceMappingURL=packagetiermap.service.d.ts.map