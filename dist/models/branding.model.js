import { model, Schema } from "mongoose";
const brandingSchema = new Schema({
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    theme: {
        primary: { type: String, default: "#007bff" },
        secondary: { type: String, default: "#6c757d" },
        accent: { type: String, default: "#ffc107" },
        background: { type: String, default: "#ffffff" },
        text: { type: String, default: "#212259" }
    }
}, { timestamps: true });
export const Branding = model('Branding', brandingSchema);
//# sourceMappingURL=branding.model.js.map