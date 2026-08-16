import { Types } from "mongoose";
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
    private static invalidatePackageTierMapCache;
    private static validateAndFormatServices;
    private static validatePackageTier;
    static bulkUpsertMappings(payload: MappingPayload): Promise<{
        success: boolean;
        message: string;
        data: {
            packageId: Types.ObjectId;
            tierId: Types.ObjectId;
            services: IPackageTierService[];
        } | undefined;
    }>;
    static replaceMappings(payload: MappingPayload): Promise<{
        success: boolean;
        message: string;
        data: {
            packageId: Types.ObjectId;
            tierId: Types.ObjectId;
            services: IPackageTierService[];
        } | undefined;
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
        data: IPackageTierService | undefined;
    }>;
}
export {};
//# sourceMappingURL=packagetiermap.service.d.ts.map