import { model, Schema, Document } from "mongoose";

export interface IBanner extends Document {
  version: number;
  name: string;
  description: string;
  buttonText?: string;
  placement: string;
  format: string;
  isActive: boolean;
  image: string;
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

    description: {
      type: String,
      required: true,
    },

    buttonText: {
      type: String
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

    image: {
      type: String,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Banner = model<IBanner>("Banner", bannerSchema);
