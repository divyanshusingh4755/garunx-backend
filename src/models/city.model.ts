import { Schema, model, type Document, Types } from 'mongoose';

export interface ICity extends Document {
    city: String,
    state: String,
    image?: String,
    description?: String,
    isActive: Boolean,
    location?: {
        type: "Point",
        coordinates: [number, number]
    }
}

const citySchema = new Schema<ICity>({
    city: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }   // [Longitude, Latitude]
    }
}, { timestamps: true });

citySchema.index({ location: '2dsphere' });
citySchema.index({ city: 1, state: 1 });
citySchema.index({ city: 1 });
citySchema.index({ state: 1 });
citySchema.index({ isActive: 1, createdAt: -1 });
citySchema.index({
    city: 'text',
    state: 'text',
}, { name: 'CityTextSearchIndex' });

export const City = model<ICity>('City', citySchema)