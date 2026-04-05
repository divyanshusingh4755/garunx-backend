import { model, Schema, Document, Types } from "mongoose";

export interface IVariant {
    _id: Types.ObjectId;
    location: string;
    tier: string;
    price: number;
    description?: string;
}

export interface IProduct extends Document {
    name: string;
    isRemovable: boolean;
    categoryName: string;
    description: string;
    imageUrl?: string;
    adminNotes?: string;
    variants: IVariant[];
}

const productSchema = new Schema<IProduct>({
    name: {type: String, required: true, trim: true},
    isRemovable: {type: Boolean, default: true},
    categoryName: {type: String, required: true},
    description: {type: String, required: true},
    imageUrl: {type: String},
    adminNotes: {type: String},
    variants: [{
        location: {type: String, require: true},
        tier: { type:String, required: true},
        price: {type: Number, required: true, min: 0},
        description: String
    }]
}, {timestamps: true})

productSchema.index({"variants.location": 1})
productSchema.index({ categoryName: 1 });

productSchema.index({
    name: 'text',
    categoryName: 'text',
    description: 'text'
}, { name: 'ProductTextSearchIndex' });

productSchema.index({ isRemovable: 1, createdAt: -1 });

export const Product = model<IProduct>('Product', productSchema)