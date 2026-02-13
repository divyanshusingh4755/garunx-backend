import { model, Schema } from "mongoose";
const servicePricingSchema = new Schema({
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
});
servicePricingSchema.index({ serviceId: 1, locationId: 1 }, { unique: true });
export const ServicePricing = model('ServicePricing', servicePricingSchema);
//# sourceMappingURL=servicepricing.model.js.map