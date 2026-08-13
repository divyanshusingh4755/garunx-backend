import type { Request, Response } from "express";
export declare const createFaq: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateFaq: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFaqById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteFaq: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleFaqStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllFaqs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPublicFaqs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=faq.controllers.d.ts.map