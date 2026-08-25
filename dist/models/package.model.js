import { Schema, model, Types, Document } from "mongoose";
const packageLocationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    locationId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Location",
        index: true,
    },
}, { _id: false });
const packageTierSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Tier",
        index: true,
    },
}, { _id: false });
const packageSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    shortDescription: {
        type: String,
        required: true,
        maxlength: 200,
    },
    fullDescription: {
        type: String,
        required: true,
    },
    thumbnailImage: {
        type: String,
        required: true,
    },
    bannerImage: {
        type: String,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    locations: [packageLocationSchema],
    tiers: [packageTierSchema],
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    packageReference: {
        type: String,
        unique: true,
    },
    isComplete: {
        type: Boolean,
        default: false,
        index: true,
    },
    startingPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
});
packageSchema.virtual("tierMappings", { ref: "PackageTierMap", localField: "_id", foreignField: "packageId" });
packageSchema.virtual("tierPricing", { ref: "PackageTierPricing", localField: "_id", foreignField: "packageId" });
packageSchema.index({ categoryId: 1, isActive: 1, isComplete: 1 });
packageSchema.index({ name: 1 });
packageSchema.index({ name: "text", shortDescription: "text" }, { name: "PackageTextSearchIndex" });
packageSchema.index({ isActive: 1, categoryId: 1 });
export const Package = model("Package", packageSchema);
//# sourceMappingURL=package.model.js.map