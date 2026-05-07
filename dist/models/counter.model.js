import { model, Schema } from "mongoose";
const counterSchema = new Schema({
    id: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});
export const Counter = model("Counter", counterSchema);
//# sourceMappingURL=counter.model.js.map