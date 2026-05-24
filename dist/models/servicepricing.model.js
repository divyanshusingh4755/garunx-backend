import { model, Schema, Document, Types } from "mongoose";
const servicePricingSchema = new Schema({
    name: { type: String, required: true },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true,
    },
    componentId: {
        type: Schema.Types.ObjectId,
        ref: "Component",
        required: true,
        index: true,
    },
    tierId: {
        type: Schema.Types.ObjectId,
        ref: "Tier",
        required: true,
        index: true,
    },
    locationId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true,
        index: true,
    },
    price: { type: Number, required: true, min: 0 },
}, { timestamps: true });
servicePricingSchema.index({ serviceId: 1, componentId: 1, tierId: 1, locationId: 1 }, { unique: true });
servicePricingSchema.index({
    serviceId: 1,
    tierId: 1,
    locationId: 1,
});
export const ServicePricing = model("ServicePricing", servicePricingSchema);
//# sourceMappingURL=servicepricing.model.js.map