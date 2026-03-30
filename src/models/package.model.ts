import { model, Schema, Types, Document } from "mongoose";

interface IPackageItem {
    productId: Types.ObjectId;
    variantTier: string;
    quantity: number;
}

interface IPackagePrice {
    location: string;
    price: number;
    originalPrice?: number;
}

export interface IPackage extends Document {
    name: string;
    description: string;
    category: string;
    items: IPackageItem[];
    locationPrices: IPackagePrice[]
    isActive: boolean;
    thumbnailImage: string;
}

const packageSchema = new Schema<IPackage>({
    name: { type: String, required: true, trim: true },
    description: {type: String, required: true},
    category: {type: String, required: true, index: true},

    items: [{
        productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        variantTier: {type: String, required: true},
        quantity: {type: Number, default: 1}
    }],

    locationPrices: [{
        location: {type: String, required: true},
        price: {type: Number, required: true},
        originalPrice: {type: Number}
    }],

    thumbnailImage: {type: String, required: true},
    isActive: { type: Boolean, default: true }
})

packageSchema.index({"locationPrices.location": 1, isActive: 1})

export const Package = model<IPackage>('Package', packageSchema)