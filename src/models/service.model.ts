import { model, Schema, Types, Document } from "mongoose";

interface ISubService {
    name: string;
    slug: string;
    description?: string;
    displayOrder: number;
    productIds: Types.ObjectId[];
}

export interface IService extends Document {
    name: string;
    locations: string[];
    shortDescription: string;
    fullDescription?: string;
    category: string;   // ex: "Puja", "Astrology"
    thumbnailImage?: string;
    bannerImage?: string;
    subServices: ISubService[];
    isActive: boolean;
}

const serviceSchema = new Schema<IService>({
    name: { type: String, required: true, trim: true },
    locations: [{type: String, required: true}],
    shortDescription: {type: String, required: true, maxLength: 200},
    fullDescription: { type: String, required: true },
    thumbnailImage: { type: String, required: true },
    bannerImage: { type: String },
    category: { type: String, required: true, index: true },
    // Sub Service: Ritual. ProductIds: Pandit, Samagri Kit
    // Sub Service: Logistics. ProductIds: Boat Rental, Flower
    // Sub Service: Post-Ritual. ProductIds: Bhoj/Catering, Brahman Bhojan
    subServices: [{
        name: {type: String, required: true},
        slug: { type: String, required: true },
        description: String,
        displayOrder: {type: Number, default: 0},
        productIds: [{type: Schema.Types.ObjectId, ref: 'Product'}]
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

export const Service = model<IService>('Service', serviceSchema);