import { model, Schema, Types, Document } from "mongoose";

export interface ILocationService {
  name: string;
  isActive: boolean;
  locationId: Types.ObjectId;
}

export interface IServiceTier {
  name: string;
  tierId: Types.ObjectId;
}

export interface IService extends Document {
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: Types.ObjectId;
  thumbnailImage?: string;
  bannerImage?: string;
  isActive: boolean;
  serviceReference: string;
  locations: ILocationService[];
  tiers: IServiceTier[];
  isComplete: boolean;
  subServiceComponents?: any[];
}

const locationSchema = new Schema<ILocationService>(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    locationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Location",
    },
  },
  { _id: false },
);

const tierSchema = new Schema<IServiceTier>(
  {
    name: { type: String, required: true },
    tierId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Tier",
    },
  },
  { _id: false },
);

const serviceSchema = new Schema<IService>(
  {
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

serviceSchema.virtual("subServiceComponents", {
  ref: "SubServiceComponent",
  localField: "_id",
  foreignField: "serviceId",
});

serviceSchema.index({
  categoryId: 1,
  isActive: 1,
  isComplete: 1,
});

serviceSchema.index({ name: 1 });

// Text Search Index
serviceSchema.index(
  {
    name: "text",
    shortDescription: "text",
  },
  { name: "ServiceTextSearchIndex" },
);

// Functional Indexes
serviceSchema.index({ isActive: 1, categoryId: 1 });

export const Service = model<IService>("Service", serviceSchema);
