import { model, Schema, Types, Document } from "mongoose";
const locationSchema = new Schema({
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    locationId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "Location",
    },
}, { _id: false });
const tierSchema = new Schema({
    name: { type: String, required: true },
    tierId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "Tier",
    },
}, { _id: false });
const serviceSchema = new Schema({
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, maxLength: 200 },
    fullDescription: { type: String, required: true },
    thumbnailImage: { type: String, required: true },
    bannerImage: { type: String },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    locations: [locationSchema],
    tiers: [tierSchema],
    isActive: { type: Boolean, default: true, index: true },
    serviceReference: { type: String, unique: true },
    isComplete: {
        type: Boolean,
        default: false,
        index: true,
    },
}, { timestamps: true });
serviceSchema.index({
    categoryId: 1,
    isActive: 1,
    isComplete: 1,
});
serviceSchema.index({
    "locations.locationId": 1,
});
serviceSchema.index({
    "tiers.tierId": 1,
});
// Text Search Index
serviceSchema.index({
    name: "text",
    shortDescription: "text",
}, { name: "ServiceTextSearchIndex" });
// Functional Indexes
serviceSchema.index({ isActive: 1, categoryId: 1 });
export const Service = model("Service", serviceSchema);
//# sourceMappingURL=service.model.js.map