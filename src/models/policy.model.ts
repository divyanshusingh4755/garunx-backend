import { Document, model, Schema } from "mongoose";

export interface IContent extends Document {
  type: "TERMS" | "PRIVACY" | "REFUND";
  title: string;
  content: string;
  isActive: boolean;
  version: number;
  publishedAt?: Date;
}

const contentSchema = new Schema<IContent>(
  {
    type: {
      type: String,
      enum: ["TERMS", "PRIVACY", "REFUND"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

contentSchema.index(
  {
    type: 1,
    isActive: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  },
);

contentSchema.index({
  type: 1,
  version: -1,
});

contentSchema.index({
  type: 1,
  publishedAt: -1,
});

export const Content = model<IContent>("Content", contentSchema);
