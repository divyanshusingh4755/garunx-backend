import type { Request, Response } from "express";
export declare const getMyNotifications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnreadCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAllAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteNotification: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendAdminNotification: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryNotificationEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryNotificationPush: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notification.controller.d.ts.map