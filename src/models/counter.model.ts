import { model, Schema } from "mongoose";

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>("Counter", counterSchema);
