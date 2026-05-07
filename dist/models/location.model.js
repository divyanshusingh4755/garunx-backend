import { Schema, model, Types } from "mongoose";
const locationSchema = new Schema({
    name: { type: String, required: true, trim: true, index: true },
    country: { type: String, required: true, index: true },
    stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
        required: true,
        index: true,
    },
    cityId: {
        type: Schema.Types.ObjectId,
        ref: "City",
        required: true,
        index: true,
    },
    fullAddress: { type: String, required: true },
    pincode: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    location: {
        type: { type: String, enum: ["Point"] },
        coordinates: { type: [Number] },
    },
}, { timestamps: true });
locationSchema.index({
    location: "2dsphere",
});
locationSchema.index({
    country: 1,
    stateId: 1,
    cityId: 1,
    pincode: 1,
});
locationSchema.index({
    isActive: 1,
    createdAt: -1,
});
locationSchema.index({
    pincode: 1,
});
locationSchema.index({
    name: "text",
    fullAddress: "text",
    pincode: "text",
}, { name: "LocationTextSearchIndex" });
export const Location = model("Location", locationSchema);
//# sourceMappingURL=location.model.js.map