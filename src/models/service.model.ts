import { model, Schema, Types, Document } from "mongoose";

export interface ISubServiceVariant {
    variantId: Types.ObjectId;
    displayOrder?: number;
    isOptional?: boolean;
    isEditable?: boolean;
}

interface ISubService {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    displayOrder: number;
    variants: ISubServiceVariant[];
}

export interface IService extends Document {
    name: string;
    locations: string[];
    shortDescription: string;
    fullDescription?: string;
    category: string;
    thumbnailImage?: string;
    bannerImage?: string;
    subServices: ISubService[];
    isActive: boolean;
}

const subServiceVariantSchema = new Schema<ISubServiceVariant>({
    variantId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    displayOrder: { type: Number, default: 0 },
    isOptional: { type: Boolean, default: false },
    isEditable: { type: Boolean, default: true },
}, { _id: false });

const subServiceSchema = new Schema<ISubService>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: { type: String },
    displayOrder: { type: Number, default: 0 },
    variants: {
        type: [subServiceVariantSchema],
        validate: {
            validator: function (variants: ISubServiceVariant[]) {
                if (!variants || variants.length === 0) return true;
                const ids = variants.map(v => v.variantId.toString());
                return new Set(ids).size === ids.length;
            },
            message: "Duplicate variantIds are not allowed in subService"
        }
    }
}, { _id: true });

const serviceSchema = new Schema<IService>({
    name: { type: String, required: true, trim: true },
    locations: [{ type: String, required: true, index: true }],
    shortDescription: { type: String, required: true, maxLength: 200 },
    fullDescription: { type: String, required: true },
    thumbnailImage: { type: String, required: true },
    bannerImage: { type: String },
    category: { type: String, required: true, index: true },
    subServices: [subServiceSchema],
    isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

// Text Search Index
serviceSchema.index({
    name: 'text',
    shortDescription: 'text',
    category: 'text'
}, { name: 'ServiceTextSearchIndex' });

// Functional Indexes
serviceSchema.index({ isActive: 1, category: 1 });
serviceSchema.index({ locations: 1 });
serviceSchema.index({ "subServices.variants.variantId": 1 });

export const Service = model<IService>('Service', serviceSchema);
