import { model, Schema, Document, Types } from "mongoose";

export interface IComponent extends Document {
  name: string;
  isRemovable: boolean;
  isBundled: boolean;
  categoryId: Types.ObjectId;
  description: string;
  imageUrl?: string;
  isActive: boolean;
}

const componentSchema = new Schema<IComponent>(
  {
    name: { type: String, required: true, trim: true, index: true },
    isRemovable: { type: Boolean, default: true },
    isBundled: { type: Boolean, default: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: { type: String, required: true },
    imageUrl: { type: String },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

componentSchema.index({ categoryId: 1 });

componentSchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    name: "ComponentTextSearchIndex",
  },
);

componentSchema.index({ isRemovable: 1, createdAt: -1 });
componentSchema.index({ isBundled: 1, createdAt: -1 });

export const Component = model<IComponent>("Component", componentSchema);
