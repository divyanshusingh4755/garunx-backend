import { Schema, model, Types, Document } from "mongoose";

export interface IPackageLocation {
  name: string;
  isActive: boolean;
  locationId: Types.ObjectId;
}

export interface IPackageTier {
  name: string;
  tierId: Types.ObjectId;
}

export interface IPackage extends Document {
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: Types.ObjectId;
  thumbnailImage: string;
  bannerImage?: string;
  isActive: boolean;
  packageReference: string;
  locations: IPackageLocation[];
  tiers: IPackageTier[];
  isComplete: boolean;
  startingPrice: number;
  commissionPercentage: number;
}

const packageLocationSchema = new Schema<IPackageLocation>(
  {
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
  },
  { _id: false },
);

const packageTierSchema = new Schema<IPackageTier>(
  {
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
  },
  { _id: false },
);

const packageSchema = new Schema<IPackage>(
  {
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
    commissionPercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  },
);

packageSchema.virtual("tierMappings", { ref: "PackageTierMap", localField: "_id", foreignField: "packageId" });
packageSchema.virtual("tierPricing", { ref: "PackageTierPricing", localField: "_id", foreignField: "packageId" });

packageSchema.index({ categoryId: 1, isActive: 1, isComplete: 1 });
packageSchema.index({ name: 1 });
packageSchema.index({ name: "text", shortDescription: "text" }, { name: "PackageTextSearchIndex" });
packageSchema.index({ isActive: 1, categoryId: 1 });

export const Package = model<IPackage>("Package", packageSchema);
