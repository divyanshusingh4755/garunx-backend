import {
  model,
  Schema,
  type Document,
} from "mongoose";

export type FaqType =
  | "User"
  | "Coordinator"
  | "User_Query"
  | "Coordinator_Query";

export interface IFAQ extends Document {
  version: number;
  name: string;
  question: string;
  answer: string;
  isActive: boolean;
  displayOrder: number;
  faqType: FaqType;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    version: {
      type: Number,
      default: 1,
      min: 1,
    },

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

    isActive: {
      type: Boolean,
      default: true,
    },

    faqType: {
      type: String,
      enum: [
        "User",
        "Coordinator",
        "User_Query",
        "Coordinator_Query",
      ],
      default: "User",
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

faqSchema.index({
  name: 1,
});

faqSchema.index(
  {
    name: "text",
    question: "text",
    answer: "text",
  },
  {
    name: "FAQTextSearchIndex",
  },
);

faqSchema.index({
  faqType: 1,
  isActive: 1,
  displayOrder: 1,
});

export const FAQ =
  model<IFAQ>(
    "FAQ",
    faqSchema,
  );
