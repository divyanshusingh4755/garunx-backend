import { model, Schema, Document } from "mongoose";

export interface IComponentItem extends Document {
  name: string;
  price?: number;
  isActive: boolean;
}

const componentItemSchema = new Schema<IComponentItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

componentItemSchema.index(
  {
    name: "text",
  },
  { name: "ComponentItemTextSearchIndex" },
);

export const ComponentItem = model<IComponentItem>(
  "ComponentItem",
  componentItemSchema,
);
