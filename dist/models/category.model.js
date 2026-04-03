import { model, Schema } from "mongoose";
const categorySchema = new Schema({
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['service', 'product'], required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 }
}, { timestamps: true });
categorySchema.index({ value: 1 });
categorySchema.index({ type: 1, isActive: 1, displayOrder: 1 });
categorySchema.index({
    label: 'text',
    value: 'text',
}, { name: 'CategoryTextSearchIndex' });
export const Category = model('Category', categorySchema);
//# sourceMappingURL=category.model.js.map