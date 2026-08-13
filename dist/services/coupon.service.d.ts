import { Types } from "mongoose";
import { type ICoupon } from "../models/coupon.model.js";
type CouponUpdateData = Partial<Pick<ICoupon, "name" | "couponCode" | "applicableOn" | "services" | "packages" | "assignedUserId" | "discount" | "discountType" | "usageLimit" | "validFrom" | "validTill" | "minOrderAmount" | "maxDiscountAmount" | "isFirstOrderOnly">>;
interface GetAvailableCouponsInput {
    userId: string;
    serviceId?: string;
    packageId?: string;
    orderAmount?: number;
    isFirstOrder?: boolean;
}
interface ValidateCouponInput {
    couponCode: string;
    serviceId?: string;
    packageId?: string;
    orderAmount: number;
    userId?: string;
    isFirstOrder?: boolean;
}
export declare class CouponService {
    private static ensureValidId;
    static createCoupon(couponData: CouponUpdateData): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCoupon(id: string, updateData: CouponUpdateData): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getCouponById(id: string): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static deleteCoupon(id: string): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static toggleCouponStatus(id: string): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findCoupons(searchTerm?: string, limit?: number, page?: number, isActive?: boolean, assignedUserId?: string, applicableOn?: string | string[], sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ICoupon & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static validateCoupon({ couponCode, serviceId, packageId, orderAmount, userId, isFirstOrder, }: ValidateCouponInput): Promise<{
        couponId: Types.ObjectId;
        couponCode: string;
        applicableOn: import("../models/coupon.model.js").CouponApplicableOn;
        discountType: import("../models/coupon.model.js").CouponDiscountType;
        discount: number;
        discountAmount: number;
        finalAmount: number;
    }>;
    static getAvailableCoupons({ userId, serviceId, packageId, orderAmount, isFirstOrder, }: GetAvailableCouponsInput): Promise<(ICoupon & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export {};
//# sourceMappingURL=coupon.service.d.ts.map