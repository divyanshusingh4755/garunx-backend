import type { Request, Response } from "express";
export declare const getByBookingId: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const closeConversation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=chatconversation.controllers.d.ts.map