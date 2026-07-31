import type { Request, Response } from "express";
export declare const createTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTierById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleTierStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tier.controllers.d.ts.map