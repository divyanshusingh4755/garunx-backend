import {
  model,
  Schema,
  type Document,
} from "mongoose";

export interface ICategory extends Document {
  label: string;
  value: string;
  type: "service" | "product";
  image?: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

const categorySchema = new Schema<ICategory>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["service", "product"],
      required: true,
    },

    image: {
      type: String,
    },

    description: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
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

categorySchema.index({
  type: 1,
  isActive: 1,
  displayOrder: 1,
});

categorySchema.index({ label: 1 });

categorySchema.index(
  {
    label: "text",
    value: "text",
  },
  {
    name: "CategoryTextSearchIndex",
  },
);

export const Category = model<ICategory>(
  "Category",
  categorySchema,
);
