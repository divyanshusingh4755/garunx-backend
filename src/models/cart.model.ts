import mongoose, { Model } from "mongoose";
import { Schema } from "mongoose";

export interface ICartItem {
    targetId: string;
    itemType: "SERVICE" | "PACKAGE";
    selectedVariantIds: string[]
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
        }
    }],
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);