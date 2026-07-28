import type { Types } from "mongoose";

export type TaxPriceMode =
  | "EXCLUSIVE"
  | "INCLUSIVE";

export type TaxJurisdiction =
  | "INTRA_STATE"
  | "INTER_STATE";

export type TaxSourceType =
  | "SERVICE_PRICING"
  | "PACKAGE_PRICING";

export enum TaxSource {
  SERVICE_PRICING = "SERVICE_PRICING",
  PACKAGE_PRICING = "PACKAGE_PRICING",
}

export interface ITaxProfileSnapshot {
  taxProfileId: Types.ObjectId;

  name: string;
  code: string;

  treatment:
  | "TAXABLE"
  | "EXEMPT"
  | "NIL_RATED"
  | "NON_GST";

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