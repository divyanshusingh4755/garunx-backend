import type { Request, Response } from 'express';
export declare const createService: (req: Request, res: Response) => Promise<void>;
export declare const updateService: (req: Request, res: Response) => Promise<void>;
export declare const deleteService: (req: Request, res: Response) => Promise<void>;
export declare const getServiceById: (req: Request, res: Response) => Promise<void>;
export declare const addSubService: (req: Request, res: Response) => Promise<void>;
export declare const addProductsToSubService: (req: Request, res: Response) => Promise<void>;
export declare const getServiceDetails: (req: Request, res: Response) => Promise<void>;
export declare const updateSubService: (req: Request, res: Response) => Promise<void>;
export declare const deleteSubService: (req: Request, res: Response) => Promise<void>;
export declare const removeProductFromSubService: (req: Request, res: Response) => Promise<void>;
export declare const getAllServices: (req: Request, res: Response) => Promise<void>;
export declare const getFilteredServices: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=service.controllers.d.ts.map