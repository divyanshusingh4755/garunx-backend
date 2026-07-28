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
    },
    discountPercent: {
        type: Number,
        min: 0,
        max: 100,
    },
    finalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    taxProfileId: {
        type: Schema.Types.ObjectId,
        ref: "TaxProfile",
        default: null,
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