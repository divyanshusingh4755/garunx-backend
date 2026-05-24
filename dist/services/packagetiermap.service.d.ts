export declare class PackageTierMapService {
    static bulkUpsertMappings(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static replaceMappings(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static getServicesByPackageAndTier(packageId: string, tierId: string): Promise<{
        serviceId: any;
        name: any;
        isRequired: any;
    }[]>;
    static patchService(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=packagetiermap.service.d.ts.map