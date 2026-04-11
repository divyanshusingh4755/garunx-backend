import mongoose, { Model } from "mongoose";
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
export declare const Cart: Model<ICart>;
//# sourceMappingURL=cart.model.d.ts.map