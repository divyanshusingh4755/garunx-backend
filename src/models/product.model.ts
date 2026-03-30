import { model, Schema, Document } from "mongoose";

export interface IVariant {
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
    unit: string;   // e.g: "per person", "per event"
    imageUrl?: string;
    adminNotes?: string;
    variants: IVariant[];
}

const productSchema = new Schema<IProduct>({
    name: {type: String, required: true, trim: true},
    isRemovable: {type: Boolean, default: true},
    categoryName: {type: String, required: true},
    description: {type: String, required: true},
    unit: {type: String, default: "per event"},
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

export const Product = model<IProduct>('Product', productSchema)