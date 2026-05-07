import { model, Schema, Document } from "mongoose";
const componentItemSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    price: { type: Number },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
componentItemSchema.index({
    name: "text",
}, { name: "ComponentItemTextSearchIndex" });
export const ComponentItem = model("ComponentItem", componentItemSchema);
//# sourceMappingURL=componentitem.model.js.map