import type { Request, Response } from "express";
export declare const createPolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePolicy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllPolicies: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const togglePolicyStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPolicyByType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportPoliciesCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=policy.controllers.d.ts.map