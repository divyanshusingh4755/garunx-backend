import { model, Schema, Types, type Document } from "mongoose";
import { TaxTreatment } from "../types/tax.types.js";

export interface ITaxProfile extends Document {
  name: string;
  code: string;
  treatment: TaxTreatment;
  totalRate: number;
  description?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taxProfileSchema = new Schema<ITaxProfile>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      minlength: 2,
      maxlength: 50,
      match: /^[A-Z0-9_]+$/,
    },

    treatment: {
      type: String,
      enum: Object.values(TaxTreatment),
      required: true,
      index: true,
    },

    totalRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

taxProfileSchema.pre("validate", function () {
  if (this.treatment === "TAXABLE" && this.totalRate <= 0) {
    throw new Error("Taxable tax profile must have a rate greater than zero");
  }

  if (this.treatment !== "TAXABLE" && this.totalRate !== 0) {
    throw new Error("Non-taxable tax profiles must have a rate equal to zero");
  }
});

taxProfileSchema.index({
  treatment: 1,
  totalRate: 1,
});

taxProfileSchema.index(
  {
    name: "text",
    code: "text",
  },
  {
    name: "TaxProfileTextSearchIndex",
  },
);

export const TaxProfile = model<ITaxProfile>("TaxProfile", taxProfileSchema);
