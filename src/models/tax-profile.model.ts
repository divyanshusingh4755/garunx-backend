import {
  Document,
  model,
  Schema,
  Types,
} from "mongoose";

export type TaxTreatment =
  | "TAXABLE"
  | "EXEMPT"
  | "NIL_RATED"
  | "NON_GST";

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
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 50,
    },

    treatment: {
      type: String,
      enum: [
        "TAXABLE",
        "EXEMPT",
        "NIL_RATED",
        "NON_GST",
      ] satisfies TaxTreatment[],
      required: true,
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
  if (
    this.treatment === "TAXABLE" &&
    this.totalRate <= 0
  ) {
    throw new Error(
      "Taxable tax profile must have a rate greater than zero",
    );
  }
});

taxProfileSchema.index({
  isActive: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
});

taxProfileSchema.index({
  treatment: 1,
  totalRate: 1,
});

taxProfileSchema.index(
  {
    name: "text",
    code: "text",
    sacCode: "text",
  },
  {
    name: "TaxProfileTextSearchIndex",
  },
);

export const TaxProfile = model<ITaxProfile>(
  "TaxProfile",
  taxProfileSchema,
);