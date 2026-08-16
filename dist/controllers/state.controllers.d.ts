import type { Request, Response } from "express";
export declare const createState: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateState: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllState: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllStatesAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStateById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteState: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportStatesCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=state.controllers.d.ts.map