import { model, Schema } from "mongoose";
const brandingSchema = new Schema({
    version: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    theme: {
        primary: {
            type: String,
            required: true,
            default: "#007bff",
            trim: true,
        },
        secondary: {
            type: String,
            required: true,
            default: "#6c757d",
            trim: true,
        },
        accent: {
            type: String,
            required: true,
            default: "#ffc107",
            trim: true,
        },
        background: {
            type: String,
            required: true,
            default: "#ffffff",
            trim: true,
        },
        text: {
            type: String,
            required: true,
            default: "#212259",
            trim: true,
        },
    },
}, {
    timestamps: true,
});
brandingSchema.index({ version: 1 }, { unique: true });
brandingSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true, } });
export const Branding = model("Branding", brandingSchema);
//# sourceMappingURL=branding.model.js.map