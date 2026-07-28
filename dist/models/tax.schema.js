import { Schema } from "mongoose";
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
        ],
        required: true,
    },
    source: {
        type: String,
        enum: [
            "SERVICE_PRICING",
            "PACKAGE_PRICING",
        ],
        required: true,
    },
}, {
    _id: false,
});
export const lineTaxSchema = new Schema({
    profile: {
        type: taxProfileSnapshotSchema,
        required: true,
    },
    jurisdiction: {
        type: String,
        enum: [
            "INTRA_STATE",
            "INTER_STATE",
        ],
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
}, {
    _id: false,
});
//# sourceMappingURL=tax.schema.js.map