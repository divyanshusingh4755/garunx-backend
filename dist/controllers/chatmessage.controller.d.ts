import type { Request, Response } from "express";
export declare const getMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnreadCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const uploadChatImages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=chatmessage.controller.d.ts.map