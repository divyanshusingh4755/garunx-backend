import { Counter } from "../models/counter.model.js";
export const getNextSequence = async (id) => {
    const normalizedId = id.trim();
    if (!normalizedId) {
        throw new Error("Counter ID is required");
    }
    const counter = await Counter.findOneAndUpdate({ id: normalizedId }, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
        .select("seq").lean();
    if (!counter) {
        throw new Error(`Unable to increment counter "${normalizedId}"`);
    }
    return counter.seq;
};
//# sourceMappingURL=getNextSequence.js.map