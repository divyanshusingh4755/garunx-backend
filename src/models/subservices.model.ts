import { model, Schema, Document, type Types } from "mongoose";

export interface ISubServiceComponent extends Document {
  name: string;
  description: string;
  serviceId: Types.ObjectId;
  image?: string;
  isActive: boolean;
}

const subServiceComponentSchema = new Schema<ISubServiceComponent>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: String,
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SubServiceComponent = model<ISubServiceComponent>(
  "SubServiceComponent",
  subServiceComponentSchema,
);
