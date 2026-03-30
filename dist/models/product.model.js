import { model, Schema, Document } from "mongoose";
const productSchema = new Schema({
    name: { type: String, required: true, trim: true },
    isRemovable: { type: Boolean, default: true },
    categoryName: { type: String, required: true },
    description: { type: String, required: true },
    unit: { type: String, default: "per event" },
    imageUrl: { type: String },
    adminNotes: { type: String },
    variants: [{
            location: { type: String, require: true },
            tier: { type: String, required: true },
            price: { type: Number, required: true, min: 0 },
            description: String
        }]
}, { timestamps: true });
productSchema.index({ "variants.location": 1 });
productSchema.index({ categoryName: 1 });
export const Product = model('Product', productSchema);
//# sourceMappingURL=product.model.js.map