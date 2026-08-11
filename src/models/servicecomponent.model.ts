import { model, Schema, type Types } from "mongoose";

export interface IServiceComponentItem {
  itemId: Types.ObjectId;
  name: string;
}

export interface IServiceComponent {
  name: string;
  description: string;
  serviceId: Types.ObjectId;
  componentId: Types.ObjectId;
  tierId: Types.ObjectId;
  isRequired: boolean;
  items: IServiceComponentItem[];
  createdAt: Date;
  updatedAt: Date;
}

const serviceComponentItemSchema = new Schema<IServiceComponentItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "ComponentItem",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const serviceComponentSchema = new Schema<IServiceComponent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

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

    isRequired: {
      type: Boolean,
      required: true,
      default: false,
    },

    items: {
      type: [serviceComponentItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

serviceComponentSchema.index(
  {
    serviceId: 1,
    componentId: 1,
    tierId: 1,
  },
  {
    unique: true,
  },
);

serviceComponentSchema.index({
  serviceId: 1,
  tierId: 1,
});

export const ServiceComponent = model<IServiceComponent>(
  "ServiceComponent",
  serviceComponentSchema,
);
