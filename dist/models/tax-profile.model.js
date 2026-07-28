import { Document, model, Schema, Types, } from "mongoose";
const taxProfileSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true,
        maxlength: 50,
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
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});
taxProfileSchema.pre("validate", function () {
    if (this.treatment === "TAXABLE" &&
        this.totalRate <= 0) {
        throw new Error("Taxable tax profile must have a rate greater than zero");
    }
});
taxProfileSchema.index({
    isActive: 1,
    effectiveFrom: 1,
    effectiveTo: 1,
});
taxProfileSchema.index({
    treatment: 1,
    totalRate: 1,
});
taxProfileSchema.index({
    name: "text",
    code: "text",
    sacCode: "text",
}, {
    name: "TaxProfileTextSearchIndex",
});
export const TaxProfile = model("TaxProfile", taxProfileSchema);
//# sourceMappingURL=tax-profile.model.js.map