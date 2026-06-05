import type { Request, Response } from "express";
export declare const createComponent: (req: Request, res: Response) => Promise<void>;
export declare const updateComponent: (req: Request, res: Response) => Promise<void>;
export declare const toggleComponentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getComponentById: (req: Request, res: Response) => Promise<void>;
export declare const getAllComponents: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=component.controllers.d.ts.map