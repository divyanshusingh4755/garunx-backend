import type { Request, Response } from "express";
export declare const paymentWebhooks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const paymentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingNotes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingSchedule: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const refundBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const expirePayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=booking.controllers.d.ts.map