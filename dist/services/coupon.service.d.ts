import { type ICoupon } from "../models/coupon.model.js";
interface ValidateCouponInput {
    couponCode: string;
    serviceId?: string | undefined;
    packageId?: string | undefined;
    orderAmount: number;
    userId?: string;
    isFirstOrder?: boolean;
}
export declare class CouponService {
    static createCoupon(couponData: Partial<ICoupon>): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static updateCoupon(id: string, updateData: Partial<ICoupon>): Promise<(import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static getCouponById(id: string): Promise<ICoupon & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteCoupon(id: string): Promise<(import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static toggleCouponStatus(id: string): Promise<import("mongoose").Document<unknown, {}, ICoupon, {}, import("mongoose").DefaultSchemaOptions> & ICoupon & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static findCoupons(searchTerm?: string, limit?: number, page?: number, isActive?: boolean, assignedUserId?: string, sortBy?: string, sortOrder?: "asc" | "desc"): Promise<{
        data: (ICoupon & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    static validateCoupon({ couponCode, serviceId, packageId, orderAmount, userId, isFirstOrder, }: ValidateCouponInput): Promise<{
        couponId: import("mongoose").Types.ObjectId;
        couponCode: string;
        applicableOn: "SERVICE" | "PACKAGE" | "ALL";
        discountType: "PERCENTAGE" | "FIXED";
        discount: number;
        discountAmount: number;
        finalAmount: number;
    }>;
}
export {};
//# sourceMappingURL=coupon.service.d.ts.map