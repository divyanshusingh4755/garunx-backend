import { Counter } from "../models/counter.model.js";
export async function getNextSequence(id) {
    const counter = await Counter.findOneAndUpdate({ id }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return counter.seq;
}
//# sourceMappingURL=getNextSequence.js.map