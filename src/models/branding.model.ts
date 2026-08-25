import { model, Schema } from "mongoose";

export interface IBrandTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface IBrand {
  version: number;
  isActive: boolean;
  theme: IBrandTheme;
  createdAt: Date;
  updatedAt: Date;
}

const brandingSchema = new Schema<IBrand>(
  {
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },

    theme: {
      primary: {
        type: String,
        required: true,
        default: "#007bff",
        trim: true,
      },

      secondary: {
        type: String,
        required: true,
        default: "#6c757d",
        trim: true,
      },

      accent: {
        type: String,
        required: true,
        default: "#ffc107",
        trim: true,
      },

      background: {
        type: String,
        required: true,
        default: "#ffffff",
        trim: true,
      },

      text: {
        type: String,
        required: true,
        default: "#212259",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

brandingSchema.index({ version: 1 }, { unique: true });
brandingSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true, } });

export const Branding = model<IBrand>("Branding", brandingSchema);
