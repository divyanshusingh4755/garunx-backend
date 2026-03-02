import { Schema, model } from 'mongoose';
const stateSchema = new Schema({
    country: { type: String, required: true },
    state: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] } // [Longitude, Latitude]
    }
}, { timestamps: true });
stateSchema.index({ state: 1 });
stateSchema.index({ country: 1 });
stateSchema.index({ createdAt: -1 });
stateSchema.index({ location: '2dsphere' });
stateSchema.index({ country: 1, state: 1 });
stateSchema.index({
    country: 'text',
    state: 'text',
}, { name: 'StateTextSearchIndex' });
export const State = model('State', stateSchema);
//# sourceMappingURL=state.model.js.map