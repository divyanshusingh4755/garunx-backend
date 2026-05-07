export interface IPricingRequest {
    targetId: string;
    type: "SERVICE" | "PACKAGE";
    selectedVariantIds?: string[];
}
export interface PriceBreakdown {
    subTotal: number;
    discount: number;
    discountPercentage: number;
    total: number;
}
export declare class PricingService {
    calculate(request: IPricingRequest): Promise<PriceBreakdown>;
    private calculateService;
    private calculatePackage;
}
//# sourceMappingURL=pricing.service.d.ts.map