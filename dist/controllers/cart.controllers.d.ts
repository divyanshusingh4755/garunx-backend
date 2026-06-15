import type { Request, Response } from "express";
export declare const createServiceCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createPackageCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserCarts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCartById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSelectedComponents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateAddonComponents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateAddonServices: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSelectedServices: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSchedule: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCustomerDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCartNotes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const recalculateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const validateCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkoutCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCart: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=cart.controllers.d.ts.map