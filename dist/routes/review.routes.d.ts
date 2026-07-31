import { type Request, type Response, type NextFunction } from "express";
declare const router: import("express-serve-static-core").Router;
export declare const createReviewValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const editReviewValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const moderateReviewValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const getMyBookingReviewValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const getMyReviewsValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const getCoordinatorReviewsValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export declare const getAllReviewsValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>))[];
export default router;
//# sourceMappingURL=review.routes.d.ts.map