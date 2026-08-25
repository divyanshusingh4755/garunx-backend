import { type ILineTax, type ITaxProfileSnapshot } from "../types/tax.types.js";
export interface CalculateLineTaxInput {
    amount: number;
    discountAmount?: number;
    profile: ITaxProfileSnapshot;
    supplierStateCode: string;
    placeOfSupplyStateCode: string;
}
export declare class TaxCalculatorService {
    private static round;
    private static validateAmount;
    private static validateProfile;
    private static normalizeStateCode;
    private static resolveJurisdiction;
    static calculateLineTax(input: CalculateLineTaxInput): ILineTax;
}
//# sourceMappingURL=tax-calculator.service.d.ts.map