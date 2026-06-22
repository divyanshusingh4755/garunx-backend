import { model, Schema, Document } from "mongoose";
const faqSchema = new Schema({
    version: { type: Number, default: 1 },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    question: {
        type: String,
        required: true,
        trim: true,
    },
    answer: {
        type: String,
        required: true,
        trim: true,
    },
    isActive: { type: Boolean, default: true },
    displayOrder: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
export const FAQ = model("FAQ", faqSchema);
//# sourceMappingURL=faq.model.js.map