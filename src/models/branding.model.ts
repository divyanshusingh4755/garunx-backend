import { model, Schema } from "mongoose";

export interface IBrand extends Document {
    version: Number
    isActive: Boolean
    theme: {
        primary: String,
        secondary: String,
        accent: String,
        background: String,
        text: String
    }
}

const brandingSchema = new Schema<IBrand>({
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    theme: {
        primary: { type: String, default: "#007bff" },
        secondary: { type: String, default: "#6c757d" },
        accent: { type: String, default: "#ffc107" },
        background: { type: String, default: "#ffffff" },
        text: { type: String, default: "#212259" }
    }
}, { timestamps: true })

export const Branding = model<IBrand>('Branding', brandingSchema)