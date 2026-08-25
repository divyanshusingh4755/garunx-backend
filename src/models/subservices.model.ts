import { model, Schema, type Types } from "mongoose";

export interface ISubServiceComponent {
  name: string;
  description: string;
  serviceId: Types.ObjectId;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subServiceComponentSchema = new Schema<ISubServiceComponent>(
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

    image: {
      type: String,
      trim: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
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

subServiceComponentSchema.index({ name: 1 });
subServiceComponentSchema.index({ name: "text", description: "text" }, { name: "SubServiceComponentTextSearchIndex" });

export const SubServiceComponent = model<ISubServiceComponent>("SubServiceComponent", subServiceComponentSchema);
