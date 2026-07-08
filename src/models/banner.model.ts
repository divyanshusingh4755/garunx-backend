import { model, Schema, Document, Types } from "mongoose";

export interface IBanner extends Document {
  version: number;
  name: string;
  description: string;
  buttonText?: string;
  placement: "HOME_TOP" | "HOME_MIDDLE" | "HOME_BOTTOM" | "CATEGORY" | "PRODUCT";
  format: "WEB" | "MOBILE" | "BOTH";
  isActive: boolean;
  image: string;
  displayOrder: number;

  redirect: {
    type: "NONE" | "SERVICE" | "PACKAGE" | "CATEGORY" | "PRODUCT" | "URL";
    refId?: Types.ObjectId;
    url?: string;
  };
}

const bannerSchema = new Schema<IBanner>(
  {
    version: {
      type: Number,
      default: 1,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    buttonText: {
      type: String,
      trim: true,
    },

    placement: {
      type: String,
      required: true,
      enum: [
        "HOME_TOP",
        "HOME_MIDDLE",
        "HOME_BOTTOM",
        "CATEGORY",
        "PRODUCT",
      ],
    },

    format: {
      type: String,
      required: true,
      enum: ["WEB", "MOBILE", "BOTH"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    image: {
      type: String,
      required: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    redirect: {
      type: {
        type: String,
        enum: ["NONE", "SERVICE", "PACKAGE", "CATEGORY", "PRODUCT", "URL"],
        default: "NONE",
      },
      refId: {
        type: Schema.Types.ObjectId,
        default: null,
        validate: {
          validator(this: any, value: Types.ObjectId) {
            if (["SERVICE", "PACKAGE", "CATEGORY", "PRODUCT"].includes(this.type)) {
              return !!value;
            }
            return true;
          },
          message: "refId is required for this redirect type",
        },
      },
      url: {
        type: String,
        default: null,
        validate: {
          validator(this: any, value: string) {
            if (this.type === "URL") {
              return !!value;
            }
            return true;
          },
          message: "url is required when redirect type is URL",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ name: 1 });

bannerSchema.index({
  placement: 1,
  format: 1,
  isActive: 1,
  displayOrder: 1,
});

bannerSchema.index({
  "redirect.type": 1,
  "redirect.refId": 1,
});

bannerSchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    name: "BannerTextSearchIndex",
  }
);

export const Banner = model<IBanner>("Banner", bannerSchema);