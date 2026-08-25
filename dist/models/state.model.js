import { Schema, model } from "mongoose";
const stateSchema = new Schema({
    country: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    image: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    gstCode: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{2}$/, "GST code must be exactly 2 digits"],
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (coordinates) => coordinates.length === 2 &&
                    coordinates.every(Number.isFinite) &&
                    coordinates[0] >= -180 &&
                    coordinates[0] <= 180 &&
                    coordinates[1] >= -90 &&
                    coordinates[1] <= 90,
                message: "Coordinates must be valid [longitude, latitude]",
            },
        },
    },
}, {
    timestamps: true,
});
stateSchema.index({ isActive: 1, createdAt: -1 });
stateSchema.index({ location: "2dsphere" });
stateSchema.index({ country: 1, name: 1 });
stateSchema.index({ name: "text" }, { name: "StateTextSearchIndex" });
stateSchema.index({ gstCode: 1 });
export const State = model("State", stateSchema);
//# sourceMappingURL=state.model.js.map