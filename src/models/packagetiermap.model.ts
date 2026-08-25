import { model, Schema, Document, Types } from "mongoose";

export interface IPackageTierService {
  serviceId: Types.ObjectId;
  name: string;
  isRequired: boolean;
  isRelated: boolean;
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
      trim: true,
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

    isRelated: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

export interface IPackageTierMap extends Document {
  packageId: Types.ObjectId;
  tierId: Types.ObjectId;
  services: IPackageTierService[];
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

    services: {
      type: [packageTierServiceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

packageTierMapSchema.index({ packageId: 1, tierId: 1 }, { unique: true, name: "UniquePackageTierMapping" });

packageTierServiceSchema.pre("validate", function () { if (this.isRequired && this.isRelated) { throw new Error("A service cannot be both required and related"); } });

export const PackageTierMap = model<IPackageTierMap>("PackageTierMap", packageTierMapSchema);
