import { model, Schema, Document, type Types } from "mongoose";

export interface IServiceComponent extends Document {
  name: string;
  serviceId: Types.ObjectId;
  componentId: Types.ObjectId;
  tierId: Types.ObjectId;
  isRequired: boolean;

  items?: {
    itemId: Types.ObjectId;
    name: string;
  }[];
}

const serviceComponentSchema = new Schema<IServiceComponent>(
  {
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
      required: true,
      index: true,
      ref: "Tier",
    },

    isRequired: { type: Boolean, default: false },

    items: [
      {
        itemId: {
          type: Schema.Types.ObjectId,
          ref: "ComponentItem",
          required: true,
        },
        name: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

serviceComponentSchema.index(
  { serviceId: 1, componentId: 1, tierId: 1 },
  { unique: true },
);

serviceComponentSchema.index({ serviceId: 1, tierId: 1 });

export const ServiceComponent = model<IServiceComponent>(
  "ServiceComponent",
  serviceComponentSchema,
);
