import { Schema, model, type Document, Types } from "mongoose";

export interface ILocation extends Document {
  name: string;
  country: string;
  stateId: Types.ObjectId;
  cityId: Types.ObjectId;
  fullAddress: string;
  pincode: string;
  image?: string;
  description?: string;
  isActive: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

const locationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true, index: true },
    country: { type: String, required: true, index: true },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
      index: true,
    },
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
    fullAddress: { type: String, required: true },
    pincode: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true },
);

locationSchema.index({
  location: "2dsphere",
});

locationSchema.index({
  country: 1,
  stateId: 1,
  cityId: 1,
  pincode: 1,
});

locationSchema.index({
  isActive: 1,
  createdAt: -1,
});

locationSchema.index({
  pincode: 1,
});

locationSchema.index(
  {
    name: "text",
    fullAddress: "text",
    pincode: "text",
  },
  { name: "LocationTextSearchIndex" },
);

export const Location = model<ILocation>("Location", locationSchema);
