import { Schema, model, Types } from 'mongoose';
const citySchema = new Schema({
    city: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] } // [Longitude, Latitude]
    }
}, { timestamps: true });
citySchema.index({ location: '2dsphere' });
citySchema.index({ city: 1, state: 1 });
citySchema.index({
    city: 'text',
    state: 'text',
}, { name: 'CityTextSearchIndex' });
export const City = model('City', citySchema);
//# sourceMappingURL=city.model.js.map