import mongoose, { Model } from "mongoose";
export interface ICartItem {
    targetId: string;
    itemType: "SERVICE" | "PACKAGE";
    selectedVariantIds: string[];
    itemKey: string;
}
export interface ICart extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId | null;
    customerDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        caste?: string;
        gotra?: string;
    };
    scheduledDate: Date;
    notes?: string;
    activeBookingId?: string;
    items: ICartItem;
    updatedAt: Date;
    createdAt: Date;
}
export declare const Cart: Model<ICart>;
//# sourceMappingURL=cart.model.d.ts.map