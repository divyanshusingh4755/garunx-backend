import { model, Schema, Document, Types } from "mongoose";
const variantSchema = new Schema({
    location: {
        type: String,
        required: true,
        index: true
    },
    tier: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });
const productSchema = new Schema({
    name: { type: String, required: true, trim: true },
    isRemovable: { type: Boolean, default: true },
    categoryName: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    adminNotes: { type: String },
    variants: {
        type: [variantSchema],
        validate: {
            validator: function (variants) {
                if (!variants || variants.length === 0)
                    return false;
                const keys = variants.map(v => `${v.location}-${v.tier}`);
                return new Set(keys).size === keys.length;
            },
            message: "Duplicate variants for same location + tier are not allowed"
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });
productSchema.index({ "variants._id": 1 });
productSchema.index({ _id: 1, "variants.location": 1, "variants.tier": 1 }, { unique: true });
productSchema.index({ categoryName: 1 });
productSchema.index({
    name: 'text',
    categoryName: 'text',
    description: 'text'
}, { name: 'ProductTextSearchIndex' });
productSchema.index({ isRemovable: 1, createdAt: -1 });
export const Product = model('Product', productSchema);
//# sourceMappingURL=product.model.js.map