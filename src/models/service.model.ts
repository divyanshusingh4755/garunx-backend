import { model, Schema } from "mongoose";

export interface IService extends Document {
    name: string;
    description: string;
    category: string;   // ex: "Puja", "Astrology"
    image?: string;
    isActive: boolean;
}

const serviceSchema = new Schema<IService>({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

export const Service = model<IService>('Service', serviceSchema);