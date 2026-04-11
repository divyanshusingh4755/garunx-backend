import mongoose, { Model } from "mongoose";
import { Schema } from "mongoose";

export interface ICartItem {
    targetId: string;
    itemType: "SERVICE" | "PACKAGE";
    selectedVariantIds: string[];
    itemKey: string;
}

export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: ICartItem[];
    updatedAt: Date;
    createdAt: Date;
}

const cartSchema: Schema<ICart> = new Schema({
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
        },
        itemKey: {
            type: String,
            required: true
        }
    }],
}, {
    timestamps: true
});

cartSchema.index({ userId: 1, "items.itemKey": 1 });

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);