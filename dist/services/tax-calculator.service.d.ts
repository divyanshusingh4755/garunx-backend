import type { ILineTax, ITaxProfileSnapshot } from "../types/tax.types.js";
export interface CalculateLineTaxInput {
    /**
     * Original line price before discount.
     */
    amount: number;
    /**
     * Discount allocated to this line.
     */
    discountAmount?: number;
    /**
     * Tax profile snapshot selected in pricing.
     */
    profile: ITaxProfileSnapshot;
    /**
     * State where your business is GST-registered.
     */
    supplierStateCode: string;
    /**
     * State of the service/customer location.
     */
    placeOfSupplyStateCode: string;
}
export declare class TaxCalculatorService {
    private static round;
    private static validateAmount;
    private static resolveJurisdiction;
    static calculateLineTax(input: CalculateLineTaxInput): ILineTax;
}
//# sourceMappingURL=tax-calculator.service.d.ts.map