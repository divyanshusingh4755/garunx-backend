import { model, Schema, type Document, Types } from "mongoose";

export type CouponApplicableOn = "ALL" | "SERVICE" | "PACKAGE" | "REFERRAL";
export type CouponDiscountType = "PERCENTAGE" | "FIXED";

export interface ICoupon extends Document {
  version: number;
  name: string;
  couponCode: string;
  applicableOn: CouponApplicableOn;
  services: Types.ObjectId[];
  packages: Types.ObjectId[];
  discount: number;
  discountType: CouponDiscountType;
  usageLimit: number;
  usedCount: number;
  validFrom?: Date;
  validTill?: Date;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isFirstOrderOnly: boolean;
  isActive: boolean;
  assignedUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    assignedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    applicableOn: {
      type: String,
      enum: ["ALL", "SERVICE", "PACKAGE", "REFERRAL"],
      default: "ALL",
      required: true,
    },

    services: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],

    packages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Package",
      },
    ],

    discount: {
      type: Number,
      required: true,
      min: 0,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      default: "PERCENTAGE",
      required: true,
    },

    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    validFrom: {
      type: Date,
    },

    validTill: {
      type: Date,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxDiscountAmount: {
      type: Number,
      min: 0,
    },

    isFirstOrderOnly: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.pre("validate", function () {
  const services = this.services ?? [];
  const packages = this.packages ?? [];

  if (this.discountType === "PERCENTAGE" && (this.discount <= 0 || this.discount > 100)) {
    throw new Error("Percentage discount must be between 1 and 100");
  }

  if (this.discountType === "FIXED" && this.maxDiscountAmount !== undefined) {
    this.set("maxDiscountAmount", undefined);
  }

  if (this.validFrom && this.validTill && this.validTill < this.validFrom) {
    throw new Error("validTill must be greater than or equal to validFrom");
  }

  if (this.applicableOn === "SERVICE") {
    if (services.length === 0) { throw new Error("At least one service is required for SERVICE coupons"); }

    if (packages.length > 0) { throw new Error("Packages are not allowed for SERVICE coupons"); }
  }

  if (this.applicableOn === "PACKAGE") {
    if (packages.length === 0) { throw new Error("At least one package is required for PACKAGE coupons"); }

    if (services.length > 0) { throw new Error("Services are not allowed for PACKAGE coupons"); }
  }

  if (this.applicableOn === "ALL" || this.applicableOn === "REFERRAL") { this.services = []; this.packages = []; }

  if (this.applicableOn === "REFERRAL" && !this.assignedUserId) { throw new Error("assignedUserId is required for REFERRAL coupons"); }
});

couponSchema.index({ name: 1 });

couponSchema.index({ isActive: 1, applicableOn: 1, assignedUserId: 1, createdAt: -1 });

couponSchema.index({ name: "text", couponCode: "text", }, { name: "CouponTextSearchIndex" });

export const Coupon = model<ICoupon>("Coupon", couponSchema);
