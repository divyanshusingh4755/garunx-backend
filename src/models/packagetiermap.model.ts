import { model, Schema, Document, Types } from "mongoose";

export interface IPackageTierService {
  serviceId: Types.ObjectId;
  name: string;
  isRequired: boolean;
}

export interface IPackageTierMap extends Document {
  packageId: Types.ObjectId;
  tierId: Types.ObjectId;
  services: IPackageTierService[];
}

const packageTierServiceSchema = new Schema<IPackageTierService>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    isRequired: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

export interface IPackageTierMap extends Document {
  packageId: Types.ObjectId;
  tierId: Types.ObjectId;
  services: {
    serviceId: Types.ObjectId;
    name: string;
    isRequired: boolean;
  }[];
}

const packageTierMapSchema = new Schema<IPackageTierMap>(
  {
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true,
    },

    tierId: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      required: true,
      index: true,
    },

    services: [packageTierServiceSchema],
  },
  {
    timestamps: true,
  },
);

packageTierMapSchema.index({
  packageId: 1,
  tierId: 1,
});

export const PackageTierMap = model<IPackageTierMap>(
  "PackageTierMap",
  packageTierMapSchema,
);
