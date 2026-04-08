import type { Request, Response } from "express";
export declare const createProduct: (req: Request, res: Response) => Promise<void>;
export declare const updateProduct: (req: Request, res: Response) => Promise<void>;
export declare const updateProductStatus: (req: Request, res: Response) => Promise<void>;
export declare const getProductById: (req: Request, res: Response) => Promise<void>;
export declare const getAllProducts: (req: Request, res: Response) => Promise<void>;
export declare const addVariant: (req: Request, res: Response) => Promise<void>;
export declare const updateVariant: (req: Request, res: Response) => Promise<void>;
export declare const toggleVariantStatus: (req: Request, res: Response) => Promise<void>;
export declare const getProductForUser: (req: Request, res: Response) => Promise<void>;
export declare const getProductsByLocation: (req: Request, res: Response) => Promise<void>;
export declare const getVariantsByLocationFromId: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=product.controllers.d.ts.map