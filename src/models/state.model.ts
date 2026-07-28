import { Schema, model, type Document } from "mongoose";

export interface IState extends Document {
  country: string;
  name: string;
  image?: string;
  description?: string;
  isActive: boolean;
  gstCode: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

const stateSchema = new Schema<IState>(
  {
    country: { type: String, required: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    gstCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{2}$/, "GST code must be exactly 2 digits"],
    },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] }, // [Longitude, Latitude]
    },
  },
  { timestamps: true },
);

stateSchema.index({
  isActive: 1,
  createdAt: -1,
});
stateSchema.index({ location: "2dsphere" });
stateSchema.index({ country: 1, name: 1 });
stateSchema.index(
  {
    name: "text",
  },
  { name: "StateTextSearchIndex" },
);

stateSchema.index({
  gstCode: 1,
});

export const State = model<IState>("State", stateSchema);
