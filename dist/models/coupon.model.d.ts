import { Document, Types } from "mongoose";
export interface ICoupon extends Document {
    version: number;
    name: string;
    couponCode: string;
    applicableOn: "ALL" | "SERVICE" | "PACKAGE" | "REFERRAL";
    services: Types.ObjectId[];
    packages: Types.ObjectId[];
    discount: number;
    discountType: "PERCENTAGE" | "FIXED";
    usageLimit: number;
    usedCount: number;
    validFrom?: Date;
    validTill?: Date;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    isFirstOrderOnly: boolean;
    isActive: boolean;
    assignedUserId?: Types.ObjectId;
}
export declare const Coupon: import("mongoose").Model<ICoupon, {}, {}, {}, Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICoupon>;
//# sourceMappingURL=coupon.model.d.ts.map