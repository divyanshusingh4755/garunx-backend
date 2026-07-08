import { model, Schema, Document, Types } from "mongoose";
const couponSchema = new Schema({
    version: {
        type: Number,
        default: 1,
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
        enum: ["ALL", "SERVICE", "PACKAGE"],
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
    },
    usageLimit: {
        type: Number,
        default: 0, // 0 = unlimited
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
}, {
    timestamps: true,
});
couponSchema.pre("save", function () {
    if (this.validFrom && this.validTill && this.validTill < this.validFrom) {
        throw new Error("validTill must be greater than validFrom");
    }
    return;
});
couponSchema.pre("validate", function () {
    const services = this.services || [];
    const packages = this.packages || [];
    if (this.applicableOn === "SERVICE" && packages.length > 0) {
        throw new Error("Package selection is not allowed for SERVICE coupons");
    }
    if (this.applicableOn === "PACKAGE" && services.length > 0) {
        throw new Error("Service selection is not allowed for PACKAGE coupons");
    }
});
couponSchema.pre("validate", function () {
    if (this.applicableOn === "ALL") {
        this.services = [];
        this.packages = [];
    }
});
couponSchema.index({ name: 1 });
couponSchema.index({
    isActive: 1,
    applicableOn: 1,
    assignedUserId: 1,
    createdAt: -1,
});
couponSchema.index({
    name: "text",
    couponCode: "text",
}, {
    name: "CouponTextSearchIndex",
});
export const Coupon = model("Coupon", couponSchema);
//# sourceMappingURL=coupon.model.js.map