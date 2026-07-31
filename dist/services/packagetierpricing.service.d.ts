import { Types } from "mongoose";
type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";
interface PackageServicePricingPayload {
    serviceId: string;
    fixedPrice?: number;
    discountPercent?: number;
    taxProfileId: string;
    taxPriceMode?: TaxPriceMode;
}
interface PackageLocationPricingPayload {
    locationId: string;
    services: PackageServicePricingPayload[];
}
interface BulkUpsertPackagePricingPayload {
    packageId: string;
    tierId: string;
    pricing: PackageLocationPricingPayload[];
}
export declare class PackageTierPricingService {
    private static roundMoney;
    static bulkUpsertTierPricing(payload: BulkUpsertPackagePricingPayload): Promise<{
        success: boolean;
        message: string;
    }>;
    static resolvePricing(packageId: string, tierId: string, locationId: string): Promise<{
        package: {
            id: Types.ObjectId;
            name: string;
            description: string;
        };
        tier: {
            id: Types.ObjectId;
            name: string;
        };
        location: {
            id: Types.ObjectId;
            name: string;
        };
        services: {
            basePrice: number | null;
            fixedPrice: any;
            discountPercent: any;
            price: any;
            taxConfiguration: {
                taxProfile: any;
                taxPriceMode: any;
            } | null;
            isPriceConfigured: boolean;
            isTaxConfigured: boolean;
            isFullyConfigured: boolean;
            serviceId: any;
            name: any;
            shortDescription: any;
            thumbnailImage: any;
            isRequired: any;
            isRelated: any;
        }[];
        summary: {
            totalServices: number;
            requiredServiceCount: number;
            optionalServiceCount: number;
            startingPrice: number;
            isAvailable: boolean;
        };
    }>;
}
export {};
//# sourceMappingURL=packagetierpricing.service.d.ts.map