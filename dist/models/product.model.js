import { model, Schema, Document, Types } from "mongoose";
const productSchema = new Schema({
    name: { type: String, required: true, trim: true },
    isRemovable: { type: Boolean, default: true },
    categoryName: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    adminNotes: { type: String },
    variants: [{
            location: { type: String, required: true },
            tier: { type: String, required: true },
            price: { type: Number, required: true, min: 0 },
            description: String
        }]
}, { timestamps: true });
productSchema.index({ "variants.location": 1 });
productSchema.index({ categoryName: 1 });
productSchema.index({
    name: 'text',
    categoryName: 'text',
    description: 'text'
}, { name: 'ProductTextSearchIndex' });
productSchema.index({ isRemovable: 1, createdAt: -1 });
export const Product = model('Product', productSchema);
//# sourceMappingURL=product.model.js.map