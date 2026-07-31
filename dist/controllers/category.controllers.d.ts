import type { Request, Response } from "express";
export declare const createCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCategoryById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleCategoryStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllCategories: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=category.controllers.d.ts.map