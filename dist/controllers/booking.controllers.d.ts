import type { Request, Response } from "express";
export declare const paymentWebhooks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const paymentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=booking.controllers.d.ts.map