import { Types } from "mongoose";
export declare class PackageTierPricingService {
    static bulkUpsertTierPricing(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static resolvePricing(packageId: string, tierId: string, locationId: string): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            description: string | undefined;
        };
        tier: {
            id: Types.ObjectId;
            name: string;
        };
        location: {
            id: Types.ObjectId;
            name: string;
        };
        services: any[];
        summary: {
            totalServices: number;
            requiredServiceCount: number;
            optionalServiceCount: number;
            startingPrice: any;
            isAvailable: boolean;
        };
    }>;
}
//# sourceMappingURL=packagetierpricing.service.d.ts.map