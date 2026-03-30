import { model, Schema, Types, Document } from "mongoose";
const packageSchema = new Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    items: [{
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            variantTier: { type: String, required: true },
            quantity: { type: Number, default: 1 }
        }],
    locationPrices: [{
            location: { type: String, required: true },
            price: { type: Number, required: true },
            originalPrice: { type: Number }
        }],
    thumbnailImage: { type: String, required: true },
    isActive: { type: Boolean, default: true }
});
packageSchema.index({ "locationPrices.location": 1, isActive: 1 });
export const Package = model('Package', packageSchema);
//# sourceMappingURL=package.model.js.map