import type { Request, Response } from "express";
export declare const createState: (req: Request, res: Response) => Promise<void>;
export declare const updateState: (req: Request, res: Response) => Promise<void>;
export declare const getAllState: (req: Request, res: Response) => Promise<void>;
export declare const getStateById: (req: Request, res: Response) => Promise<void>;
export declare const deleteState: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=state.controllers.d.ts.map