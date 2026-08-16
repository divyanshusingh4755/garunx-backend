import type { Request, Response } from "express";
export declare const createBanner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBanner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBannerById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteBanner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleBannerStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllBanners: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPublicBanners: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportBannersCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=banner.controllers.d.ts.map