import { model, Schema, type Types } from "mongoose";

export interface ILocationService {
  name: string;
  isActive: boolean;
  locationId: Types.ObjectId;
}

export interface IServiceTier {
  name: string;
  tierId: Types.ObjectId;
}

export interface IService {
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: Types.ObjectId;
  thumbnailImage: string;
  bannerImage?: string;
  isActive: boolean;
  serviceReference: string;
  locations: ILocationService[];
  tiers: IServiceTier[];
  isComplete: boolean;
  startingPrice: number;
  subServiceComponents?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocationService>(
  {
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
  },
  {
    _id: false,
  },
);

const tierSchema = new Schema<IServiceTier>(
  {
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
  },
  {
    _id: false,
  },
);

const serviceSchema = new Schema<IService>(
  {
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

serviceSchema.index({
  name: 1,
});

serviceSchema.index(
  {
    name: "text",
    shortDescription: "text",
  },
  {
    name: "ServiceTextSearchIndex",
  },
);

serviceSchema.index({
  isActive: 1,
  categoryId: 1,
});

export const Service = model<IService>("Service", serviceSchema);
