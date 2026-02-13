import { Schema, model, type Document, Types } from 'mongoose';

export interface ILocation extends Document {
    name: String,
    country: String,
    state: String,
    city: String,
    fullAddress: String,
    pincode: String,
    image?: String,
    description?: String,
    isActive: Boolean,
    location?: {
        type: "Point",
        coordinates: [number, number]
    }
}

const locationSchema = new Schema<ILocation>({
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
        coordinates: { type: [Number] }   // [Longitude, Latitude]
    }
}, { timestamps: true });

locationSchema.index({ location: '2dsphere', city: 1 })
locationSchema.index({ country: 1, state: 1, city: 1, pincode: 1 })
locationSchema.index({
    country: 'text',
    state: 'text',
    city: 'text',
    fullAddress: 'text',
    pincode: 'text'
}, { name: 'LocationTextSearchIndex' })

export const Location = model<ILocation>('Location', locationSchema)