import { model, Schema } from "mongoose";
const locationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    locationId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "Location",
    },
}, {
    _id: false,
});
const tierSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "Tier",
    },
}, {
    _id: false,
});
const serviceSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    shortDescription: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200,
    },
    fullDescription: {
        type: String,
        required: true,
        trim: true,
    },
    thumbnailImage: {
        type: String,
        required: true,
        trim: true,
    },
    bannerImage: {
        type: String,
        trim: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    locations: {
        type: [locationSchema],
        default: [],
    },
    tiers: {
        type: [tierSchema],
        default: [],
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
    serviceReference: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    isComplete: {
        type: Boolean,
        required: true,
        default: false,
        index: true,
    },
    startingPrice: {
        type: Number,
        required: true,
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
serviceSchema.virtual("subServiceComponents", { ref: "SubServiceComponent", localField: "_id", foreignField: "serviceId" });
serviceSchema.index({ categoryId: 1, isActive: 1, isComplete: 1 });
serviceSchema.index({ name: 1 });
serviceSchema.index({ name: "text", shortDescription: "text" }, { name: "ServiceTextSearchIndex" });
serviceSchema.index({ isActive: 1, categoryId: 1 });
export const Service = model("Service", serviceSchema);
//# sourceMappingURL=service.model.js.map