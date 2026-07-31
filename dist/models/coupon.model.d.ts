import { type Document, Types } from "mongoose";
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
export declare const Coupon: import("mongoose").Model<ICoupon, {}, {}, {}, Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICoupon>;
//# sourceMappingURL=coupon.model.d.ts.map