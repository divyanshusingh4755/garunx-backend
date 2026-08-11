import { model, Schema, type Document } from "mongoose";

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  seq: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
  },
});

export const Counter = model<ICounter>("Counter", counterSchema);
