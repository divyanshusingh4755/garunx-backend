import { model, Schema } from "mongoose";
const tierSchema = new Schema({
    name: { type: String, required: true, trim: true, unique: true },
    tierReference: { type: String, unique: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
tierSchema.index({ name: "text" });
export const Tier = model("Tier", tierSchema);
//# sourceMappingURL=tier.model.js.map