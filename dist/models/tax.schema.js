import { Schema, } from "mongoose";
import { TaxJurisdiction, TaxPriceMode, TaxSource } from "../types/tax.types.js";
export const taxProfileSnapshotSchema = new Schema({
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
        uppercase: true,
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
        max: 100,
    },
    priceMode: {
        type: String,
        enum: Object.values(TaxPriceMode),
        required: true,
    },
    source: {
        type: String,
        enum: Object.values(TaxSource),
        required: true,
    },
}, {
    _id: false,
});
taxProfileSnapshotSchema.pre("validate", function () {
    if (this.treatment === "TAXABLE" &&
        this.totalRate <= 0) {
        throw new Error("Taxable tax snapshot must have a rate greater than zero");
    }
    if (this.treatment !== "TAXABLE" &&
        this.totalRate !== 0) {
        throw new Error("Non-taxable tax snapshot must have a rate equal to zero");
    }
});
export const lineTaxSchema = new Schema({
    profile: {
        type: taxProfileSnapshotSchema,
        required: true,
    },
    jurisdiction: {
        type: String,
        enum: Object.values(TaxJurisdiction),
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
        max: 100,
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
        max: 100,
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
        max: 100,
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
}, {
    _id: false,
});
//# sourceMappingURL=tax.schema.js.map