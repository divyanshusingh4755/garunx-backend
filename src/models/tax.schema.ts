import { Schema } from "mongoose";

import type {
  ILineTax,
  ITaxProfileSnapshot,
  TaxJurisdiction,
  TaxPriceMode,
  TaxSourceType,
} from "../types/tax.types.js";

export const taxProfileSnapshotSchema =
  new Schema<ITaxProfileSnapshot>(
    {
      taxProfileId: {
        type: Schema.Types.ObjectId,
        ref: "TaxProfile",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      code: {
        type: String,
        required: true,
        trim: true,
      },

      treatment: {
        type: String,
        enum: [
          "TAXABLE",
          "EXEMPT",
          "NIL_RATED",
          "NON_GST",
        ],
        required: true,
      },

      totalRate: {
        type: Number,
        required: true,
        min: 0,
      },

      priceMode: {
        type: String,
        enum: [
          "EXCLUSIVE",
          "INCLUSIVE",
        ] satisfies TaxPriceMode[],
        required: true,
      },

      source: {
        type: String,
        enum: [
          "SERVICE_PRICING",
          "PACKAGE_PRICING",
        ] satisfies TaxSourceType[],
        required: true,
      },
    },
    {
      _id: false,
    },
  );

export const lineTaxSchema =
  new Schema<ILineTax>(
    {
      profile: {
        type: taxProfileSnapshotSchema,
        required: true,
      },

      jurisdiction: {
        type: String,
        enum: [
          "INTRA_STATE",
          "INTER_STATE",
        ] satisfies TaxJurisdiction[],
        required: true,
      },

      taxableAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      cgstRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      cgstAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      sgstRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      sgstAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      igstRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      igstAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalTax: {
        type: Number,
        default: 0,
        min: 0,
      },

      finalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: false,
    },
  );