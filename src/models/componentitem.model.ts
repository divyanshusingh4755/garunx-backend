import { model, Schema } from "mongoose";

export interface IComponentItem {
  name: string;
  price?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const componentItemSchema = new Schema<IComponentItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    price: {
      type: Number,
      min: 0,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

componentItemSchema.index({ name: "text" }, { name: "ComponentItemTextSearchIndex" });

export const ComponentItem = model<IComponentItem>("ComponentItem", componentItemSchema);
