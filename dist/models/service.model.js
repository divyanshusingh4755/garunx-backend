import { model, Schema } from "mongoose";
const serviceSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
export const Service = model('Service', serviceSchema);
//# sourceMappingURL=service.model.js.map