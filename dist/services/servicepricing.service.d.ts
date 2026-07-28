import { Types } from "mongoose";
type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";
interface ComponentPricingInput {
    componentId: string;
    price: number;
    taxProfileId?: string | null;
    taxPriceMode?: TaxPriceMode;
}
interface LocationPricingInput {
    locationId: string;
    components: ComponentPricingInput[];
}
interface BulkTierPricingPayload {
    serviceId: string;
    tierId: string;
    pricing: LocationPricingInput[];
}
export declare class ServicePricingService {
    static bulkUpsertTierPricing(payload: BulkTierPricingPayload): Promise<{
        success: boolean;
        message: string;
        updatedCount: number;
    }>;
    static resolvePricing(serviceId: string, tierId: string, locationId: string): Promise<{
        service: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string;
            thumbnailImage: string | undefined;
            bannerImage: string | undefined;
            serviceReference: string;
        };
        tier: {
            id: Types.ObjectId;
            name: string;
        };
        location: {
            id: Types.ObjectId;
            name: string;
        };
        components: {
            componentId: any;
            name: any;
            description: any;
            imageUrl: any;
            isRequired: boolean;
            price: number | null;
            isPriceConfigured: boolean;
            tax: {
                taxProfileId: any;
                profileName: any;
                profileCode: any;
                treatment: any;
                totalRate: any;
                priceMode: import("../models/servicepricing.model.js").TaxPriceMode;
                isTaxConfigured: boolean;
            } | null;
            items: {
                itemId: Types.ObjectId;
                name: string;
            }[];
        }[];
        summary: {
            totalComponents: number;
            requiredComponentCount: number;
            optionalComponentCount: number;
            startingPrice: number;
            isAvailable: boolean;
        };
    }>;
}
export {};
//# sourceMappingURL=servicepricing.service.d.ts.map