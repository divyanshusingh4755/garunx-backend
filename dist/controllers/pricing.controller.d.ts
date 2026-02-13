import type { Request, Response } from "express";
export declare const addOrUpdatePricing: (req: Request, res: Response) => Promise<void>;
export declare const getPricesByLocation: (req: Request, res: Response) => Promise<void>;
export declare const getPriceDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllSerivces: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=pricing.controller.d.ts.map