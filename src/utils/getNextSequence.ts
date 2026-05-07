import { Counter } from "../models/counter.model.js";

export async function getNextSequence(id: string) {
  const counter = await Counter.findOneAndUpdate(
    { id },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return counter.seq;
}
