import { Schema, model, type Document } from 'mongoose';

export interface IState extends Document {
    country: String,
    state: String,
    image?: String,
    description?: String,
    isActive: Boolean,
    location?: {
        type: "Point",
        coordinates: [number, number]
    }
}

const stateSchema = new Schema<IState>({
    country: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }   // [Longitude, Latitude]
    }
}, { timestamps: true });

stateSchema.index({ state: 1 });
stateSchema.index({ country: 1 });
stateSchema.index({ createdAt: -1 });
stateSchema.index({ location: '2dsphere' })
stateSchema.index({ country: 1, state: 1 })
stateSchema.index({
    country: 'text',
    state: 'text',
}, { name: 'StateTextSearchIndex' })

export const State = model<IState>('State', stateSchema)