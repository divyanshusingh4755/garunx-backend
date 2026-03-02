import { Schema, model, Types } from 'mongoose';
const locationSchema = new Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    fullAddress: { type: String, required: true },
    pincode: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] } // [Longitude, Latitude]
    }
}, { timestamps: true });
locationSchema.index({ name: 1 });
locationSchema.index({ city: 1 });
locationSchema.index({ pincode: 1 });
locationSchema.index({ isActive: 1, createdAt: -1 });
locationSchema.index({ location: '2dsphere', city: 1 });
locationSchema.index({ country: 1, state: 1, city: 1, pincode: 1 });
locationSchema.index({
    country: 'text',
    state: 'text',
    city: 'text',
    fullAddress: 'text',
    pincode: 'text'
}, { name: 'LocationTextSearchIndex' });
export const Location = model('Location', locationSchema);
//# sourceMappingURL=location.model.js.map