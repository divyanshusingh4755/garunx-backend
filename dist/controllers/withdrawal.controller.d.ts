import type { Request, Response } from "express";
export declare const createWithdrawal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyWithdrawals: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyWithdrawalById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelWithdrawal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllWithdrawalsAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getWithdrawalByIdAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveWithdrawal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markWithdrawalProcessing: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectWithdrawal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markWithdrawalPaid: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=withdrawal.controller.d.ts.map