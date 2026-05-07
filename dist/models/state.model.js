import { Schema, model } from "mongoose";
const stateSchema = new Schema({
    country: { type: String, required: true, index: true },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ["Point"] },
        coordinates: { type: [Number] }, // [Longitude, Latitude]
    },
}, { timestamps: true });
stateSchema.index({
    isActive: 1,
    createdAt: -1,
});
stateSchema.index({ location: "2dsphere" });
stateSchema.index({ country: 1, name: 1 });
stateSchema.index({
    name: "text",
}, { name: "StateTextSearchIndex" });
export const State = model("State", stateSchema);
//# sourceMappingURL=state.model.js.map