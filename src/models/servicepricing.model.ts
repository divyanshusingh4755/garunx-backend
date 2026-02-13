import { model, Schema } from "mongoose";

export interface IServicePricing extends Document {
    serviceId: Schema.Types.ObjectId;
    locationId: Schema.Types.ObjectId;
    price: number;
    isActive: boolean;
}

const servicePricingSchema = new Schema<IServicePricing>({
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
})

servicePricingSchema.index({ serviceId: 1, locationId: 1 }, { unique: true })

export const ServicePricing = model<IServicePricing>('ServicePricing', servicePricingSchema)