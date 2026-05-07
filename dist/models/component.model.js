import { model, Schema, Document, Types } from "mongoose";
const componentSchema = new Schema({
    name: { type: String, required: true, trim: true },
    isRemovable: { type: Boolean, default: true },
    isBundled: { type: Boolean, default: true },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    description: { type: String, required: true },
    imageUrl: { type: String },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, { timestamps: true });
componentSchema.index({ categoryId: 1 });
componentSchema.index({
    name: "text",
    categoryName: "text",
    description: "text",
}, { name: "ComponentTextSearchIndex" });
componentSchema.index({ isRemovable: 1, createdAt: -1 });
componentSchema.index({ isBundled: 1, createdAt: -1 });
export const Component = model("Component", componentSchema);
//# sourceMappingURL=component.model.js.map