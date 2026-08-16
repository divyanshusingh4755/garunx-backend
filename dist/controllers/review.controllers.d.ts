import type { Request, Response } from "express";
export declare const getAllReviews: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const editReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const moderateReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyBookingReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyReviews: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCoordinatorReviews: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportReviewsCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=review.controllers.d.ts.map