import type { Request, Response } from "express";
export declare const createProduct: (req: Request, res: Response) => Promise<void>;
export declare const updateProduct: (req: Request, res: Response) => Promise<void>;
export declare const deleteProduct: (req: Request, res: Response) => Promise<void>;
export declare const getProductById: (req: Request, res: Response) => Promise<void>;
export declare const getAllProducts: (req: Request, res: Response) => Promise<void>;
export declare const addVariant: (req: Request, res: Response) => Promise<void>;
export declare const updateVariant: (req: Request, res: Response) => Promise<void>;
export declare const deleteVariant: (req: Request, res: Response) => Promise<void>;
export declare const getProductForUser: (req: Request, res: Response) => Promise<void>;
export declare const getProductsByLocation: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=product.controllers.d.ts.map