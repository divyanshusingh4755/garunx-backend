import { model, Schema, Types, Document } from "mongoose";
const subServiceVariantSchema = new Schema({
    variantId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    displayOrder: { type: Number, default: 0 },
    isOptional: { type: Boolean, default: false },
    isEditable: { type: Boolean, default: true },
}, { _id: false });
const subServiceSchema = new Schema({
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
            validator: function (variants) {
                if (!variants || variants.length === 0)
                    return true;
                const ids = variants.map(v => v.variantId.toString());
                return new Set(ids).size === ids.length;
            },
            message: "Duplicate variantIds are not allowed in subService"
        }
    }
}, { _id: true });
const serviceSchema = new Schema({
    name: { type: String, required: true, trim: true },
    locations: [{ type: String, required: true, index: true }],
    shortDescription: { type: String, required: true, maxLength: 200 },
    fullDescription: { type: String, required: true },
    thumbnailImage: { type: String, required: true },
    bannerImage: { type: String },
    category: { type: String, required: true, index: true },
    subServices: [subServiceSchema],
    isActive: { type: Boolean, default: true, index: true },
    isComplete: { type: Boolean, default: false }
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
export const Service = model('Service', serviceSchema);
//# sourceMappingURL=service.model.js.map