import { model, Schema, } from "mongoose";
const counterSchema = new Schema({
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
export const Counter = model("Counter", counterSchema);
//# sourceMappingURL=counter.model.js.map