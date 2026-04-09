import mongoose, { Model } from "mongoose";
import { Schema } from "mongoose";
const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [{
            targetId: { type: String, required: true },
            itemType: {
                type: String,
                enum: ['SERVICE', 'PACKAGE'],
                required: true
            },
            selectedVariantIds: {
                type: [String],
                default: []
            }
        }],
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
export const Cart = mongoose.model("Cart", cartSchema);
//# sourceMappingURL=cart.model.js.map