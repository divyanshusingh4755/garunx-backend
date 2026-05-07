import { Types } from "mongoose";
export declare class ServicePricingService {
    static bulkUpsertTierPricing(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    static resolvePricing(serviceId: string, tierId: string, locationId: string): Promise<{
        service: {
            id: Types.ObjectId;
            name: string;
            shortDescription: string;
            fullDescription: string | undefined;
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
//# sourceMappingURL=servicepricing.service.d.ts.map