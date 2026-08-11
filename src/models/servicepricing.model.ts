import { model, Schema, type Types } from "mongoose";

export type TaxPriceMode = "EXCLUSIVE" | "INCLUSIVE";

export interface IServicePricing {
  serviceId: Types.ObjectId;
  componentId: Types.ObjectId;
  tierId: Types.ObjectId;
  locationId: Types.ObjectId;
  price: number;
  taxProfileId: Types.ObjectId | null;
  taxPriceMode: TaxPriceMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const servicePricingSchema = new Schema<IServicePricing>(
  {
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

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    taxProfileId: {
      type: Schema.Types.ObjectId,
      ref: "TaxProfile",
      default: null,
      index: true,
    },

    taxPriceMode: {
      type: String,
      enum: ["EXCLUSIVE", "INCLUSIVE"],
      default: "EXCLUSIVE",
      required: true,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

servicePricingSchema.pre("validate", function () {
  if (!this.taxProfileId) {
    this.taxProfileId = null;
    this.taxPriceMode = "EXCLUSIVE";
  }
});

servicePricingSchema.index(
  {
    serviceId: 1,
    componentId: 1,
    tierId: 1,
    locationId: 1,
  },
  {
    unique: true,
  },
);

servicePricingSchema.index({
  serviceId: 1,
  tierId: 1,
  locationId: 1,
  isActive: 1,
});

export const ServicePricing = model<IServicePricing>(
  "ServicePricing",
  servicePricingSchema,
);
