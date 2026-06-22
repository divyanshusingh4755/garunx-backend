import type { Request, Response } from "express";
export declare const createCoupon: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateCoupon: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const validateCoupon: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCouponById: (req: Request, res: Response) => Promise<void>;
export declare const deleteCoupon: (req: Request, res: Response) => Promise<void>;
export declare const toggleCouponStatus: (req: Request, res: Response) => Promise<void>;
export declare const getAllCoupons: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=coupon.controllers.d.ts.map