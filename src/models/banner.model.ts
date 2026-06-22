import { model, Schema, Document } from "mongoose";

export interface IBanner extends Document {
  version: number;
  name: string;
  placement: string;
  format: string;
  isActive: boolean;
  images: string[];
  displayOrder: number;
}

const bannerSchema = new Schema<IBanner>(
  {
    version: { type: Number, default: 1 },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    placement: {
      type: String,
      required: true,
      enum: ["HOME_TOP", "HOME_MIDDLE", "HOME_BOTTOM", "CATEGORY", "PRODUCT"],
    },

    format: {
      type: String,
      required: true,
      enum: ["WEB", "MOBILE", "BOTH"],
    },

    isActive: { type: Boolean, default: true },

    images: {
      type: [String],
      default: [],
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Banner = model<IBanner>("Banner", bannerSchema);
