import { model, Schema, Document, Types } from "mongoose";
const packageTierPricingSchema = new Schema({
    packageId: {
        type: Schema.Types.ObjectId,
        ref: "Package",
        required: true,
        index: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
        required: true,
        index: true,
    },
    locationId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true,
        index: true,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true,
    },
    basePrice: {
        type: Number,
        required: true,
        min: 0,
    },
    fixedPrice: {
        type: Number,
        min: 0,
        default: null,
    },
    discountPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
    },
    finalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    taxProfileId: {
        type: Schema.Types.ObjectId,
        ref: "TaxProfile",
        required: true,
        index: true,
    },
    taxPriceMode: {
        type: String,
        enum: ["EXCLUSIVE", "INCLUSIVE"],
        default: "EXCLUSIVE",
        required: true,
    },
}, {
    timestamps: true,
});
packageTierPricingSchema.pre("validate", function () {
    const hasFixedPrice = typeof this.fixedPrice ===
        "number";
    const hasDiscountPercent = typeof this.discountPercent ===
        "number";
    if (hasFixedPrice ===
        hasDiscountPercent) {
        throw new Error("Exactly one of fixedPrice or discountPercent is required");
    }
    if (!Number.isFinite(this.basePrice) ||
        !Number.isFinite(this.finalPrice)) {
        throw new Error("Package pricing values must be finite numbers");
    }
});
packageTierPricingSchema.index({
    packageId: 1,
    tierId: 1,
    locationId: 1,
    serviceId: 1,
}, {
    unique: true,
});
packageTierPricingSchema.index({
    packageId: 1,
    tierId: 1,
});
export const PackageTierPricing = model("PackageTierPricing", packageTierPricingSchema);
//# sourceMappingURL=packagetierpricing.model.js.map