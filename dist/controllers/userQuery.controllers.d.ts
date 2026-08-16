import type { Request, Response } from "express";
export declare const createUserQuery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyQueries: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserQueryById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendUserQueryMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markUserQueryAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllUserQueries: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAdminUserQueryById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendAdminQueryReply: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserQueryStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserQueryPriority: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserQueryCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignUserQuery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteUserQuery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportUserQueriesCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=userQuery.controllers.d.ts.map