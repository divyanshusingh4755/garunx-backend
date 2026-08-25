import type { Types } from "mongoose";

export enum TaxPriceMode {
  EXCLUSIVE = "EXCLUSIVE",
  INCLUSIVE = "INCLUSIVE",
}

export enum TaxJurisdiction {
  INTRA_STATE = "INTRA_STATE",
  INTER_STATE = "INTER_STATE",
}

export enum TaxSource {
  SERVICE_PRICING = "SERVICE_PRICING",
  PACKAGE_PRICING = "PACKAGE_PRICING",
}

export enum TaxTreatment {
  TAXABLE = "TAXABLE",
  EXEMPT = "EXEMPT",
  NIL_RATED = "NIL_RATED",
  NON_GST = "NON_GST",
}

export interface ITaxProfileSnapshot {
  taxProfileId: Types.ObjectId;
  name: string;
  code: string;
  treatment: TaxTreatment;
  totalRate: number;
  priceMode: TaxPriceMode;
  source: TaxSource;
}

export interface ILineTax {
  profile: ITaxProfileSnapshot;
  jurisdiction: TaxJurisdiction;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  finalAmount: number;
}

export interface ITaxSummary {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}
