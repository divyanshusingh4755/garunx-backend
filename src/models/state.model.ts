import { Schema, model, type Document } from "mongoose";

export interface IState extends Document {
  country: String;
  name: String;
  image?: String;
  description?: String;
  isActive: Boolean;
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

export const State = model<IState>("State", stateSchema);
