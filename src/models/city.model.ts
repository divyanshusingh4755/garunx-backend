import { Schema, model, type Document, Types } from "mongoose";

export interface ICity extends Document {
  name: string;
  country: string;
  stateId: Types.ObjectId;
  image?: string;
  description?: string;
  isActive: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

const citySchema = new Schema<ICity>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    country: {
      type: String,
      required: true,
      index: true,
    },

    stateId: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
      index: true,
    },

    image: {
      type: String,
    },

    description: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },

      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  { timestamps: true },
);

citySchema.index({ location: "2dsphere" });

citySchema.index({
  country: 1,
  stateId: 1,
  name: 1,
});

citySchema.index({
  isActive: 1,
  createdAt: -1,
});

citySchema.index(
  {
    name: "text",
  },
  { name: "CityTextSearchIndex" },
);

export const City = model<ICity>("City", citySchema);
