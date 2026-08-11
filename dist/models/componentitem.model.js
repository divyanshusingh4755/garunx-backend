import { model, Schema } from "mongoose";
const componentItemSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    price: {
        type: Number,
        min: 0,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
componentItemSchema.index({
    name: "text",
}, {
    name: "ComponentItemTextSearchIndex",
});
export const ComponentItem = model("ComponentItem", componentItemSchema);
//# sourceMappingURL=componentitem.model.js.map