import { TaxJurisdiction, type ILineTax, type ITaxProfileSnapshot } from "../types/tax.types.js";
export interface CalculateLineTaxInput {
  // Original line price before discount.
  amount: number;
  // Discount allocated to this line.
  discountAmount?: number;
  // Tax profile snapshot selected in pricing.
  profile: ITaxProfileSnapshot;
  // State where the business is GST-registered.
  supplierStateCode: string;
  // State of the service/customer location.
  placeOfSupplyStateCode: string;
}

export class TaxCalculatorService {
  private static round(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

  private static validateAmount(fieldName: string, value: number): void { if (typeof value !== "number" || !Number.isFinite(value) || value < 0) { throw new Error(`${fieldName} must be a valid non-negative number`); } }

  private static validateProfile(profile: ITaxProfileSnapshot): void {
    this.validateAmount("profile.totalRate", profile.totalRate);

    if (profile.totalRate > 100) { throw new Error("profile.totalRate cannot exceed 100"); }
    if (profile.treatment === "TAXABLE" && profile.totalRate <= 0) { throw new Error("Taxable profile must have a tax rate greater than zero"); }
    if (profile.treatment !== "TAXABLE" && profile.totalRate !== 0) { throw new Error("Non-taxable profile must have a tax rate equal to zero"); }
    if (profile.priceMode !== "INCLUSIVE" && profile.priceMode !== "EXCLUSIVE") { throw new Error("Invalid tax price mode"); }
  }

  private static normalizeStateCode(fieldName: string, value: string): string {
    if (typeof value !== "string") { throw new Error(`${fieldName} must be a string`); }

    const normalized = value.trim();
    if (!/^\d{2}$/.test(normalized)) { throw new Error(`${fieldName} must contain exactly two digits`); }
    return normalized;
  }

  private static resolveJurisdiction(supplierStateCode: string, placeOfSupplyStateCode: string): TaxJurisdiction {
    const supplierCode = this.normalizeStateCode("Supplier state code", supplierStateCode);
    const placeOfSupplyCode = this.normalizeStateCode("Place of supply state code", placeOfSupplyStateCode);
    return supplierCode === placeOfSupplyCode ? TaxJurisdiction.INTRA_STATE : TaxJurisdiction.INTER_STATE;
  }

  static calculateLineTax(input: CalculateLineTaxInput): ILineTax {
    const { amount, profile, supplierStateCode, placeOfSupplyStateCode } = input;
    const discountAmount = input.discountAmount ?? 0;
    this.validateAmount("amount", amount);
    this.validateAmount("discountAmount", discountAmount);
    if (discountAmount > amount) { throw new Error("discountAmount cannot be greater than amount"); }
    this.validateProfile(profile);
    const netAmount = this.round(amount - discountAmount);
    const jurisdiction = this.resolveJurisdiction(supplierStateCode, placeOfSupplyStateCode);

    // EXEMPT, NIL_RATED and NON_GST lines retain their net line amount as the base, but do not produce GST.
    if (profile.treatment !== "TAXABLE") {
      return { profile, jurisdiction, taxableAmount: netAmount, cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0, totalTax: 0, finalAmount: netAmount };
    }

    const totalApplicableRate = profile.totalRate;
    const rawTaxableAmount = profile.priceMode === "INCLUSIVE" ? netAmount / (1 + totalApplicableRate / 100) : netAmount;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (profile.priceMode === "INCLUSIVE") {
      // For inclusive pricing, derive the rounded taxable base first and assign the remaining amount as tax. This guarantees: taxableAmount + totalTax = netAmount
      const taxableAmount = this.round(rawTaxableAmount);
      const roundedTotalTax = this.round(netAmount - taxableAmount);

      if (jurisdiction === "INTRA_STATE") {
        cgstRate = totalApplicableRate / 2;
        sgstRate = totalApplicableRate / 2;
        cgstAmount = this.round(roundedTotalTax / 2);
        sgstAmount = this.round(roundedTotalTax - cgstAmount);
      } else {
        igstRate = totalApplicableRate;
        igstAmount = roundedTotalTax;
      }

      const totalTax = this.round(cgstAmount + sgstAmount + igstAmount);

      return { profile, jurisdiction, taxableAmount: this.round(netAmount - totalTax), cgstRate: this.round(cgstRate), cgstAmount, sgstRate: this.round(sgstRate), sgstAmount, igstRate: this.round(igstRate), igstAmount, totalTax, finalAmount: netAmount };
    }

    // Exclusive pricing.
    const taxableAmount = this.round(rawTaxableAmount);
    const rawTaxAmount = taxableAmount * (totalApplicableRate / 100);

    if (jurisdiction === "INTRA_STATE") {
      cgstRate = totalApplicableRate / 2;
      sgstRate = totalApplicableRate / 2;
      const roundedTotalTax = this.round(rawTaxAmount);
      cgstAmount = this.round(roundedTotalTax / 2);
      sgstAmount = this.round(roundedTotalTax - cgstAmount);
    } else {
      igstRate = totalApplicableRate;
      igstAmount = this.round(rawTaxAmount);
    }

    const totalTax = this.round(cgstAmount + sgstAmount + igstAmount);

    return { profile, jurisdiction, taxableAmount, cgstRate: this.round(cgstRate), cgstAmount, sgstRate: this.round(sgstRate), sgstAmount, igstRate: this.round(igstRate), igstAmount, totalTax, finalAmount: this.round(taxableAmount + totalTax) };
  }
}
