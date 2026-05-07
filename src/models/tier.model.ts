import { model, Schema } from "mongoose";

export interface ITier {
  name: string;
  tierReference: string;
  isActive: boolean;
}

const tierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    tierReference: { type: String, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tierSchema.index({ name: "text" });

export const Tier = model<ITier>("Tier", tierSchema);
