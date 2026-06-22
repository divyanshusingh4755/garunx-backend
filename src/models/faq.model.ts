import { model, Schema, Document } from "mongoose";

export interface IFAQ extends Document {
  version: number;
  name: string;
  question: string;
  answer: string;
  isActive: boolean;
  displayOrder: number;
}

const faqSchema = new Schema<IFAQ>(
  {
    version: { type: Number, default: 1 },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: { type: Boolean, default: true },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const FAQ = model<IFAQ>("FAQ", faqSchema);
