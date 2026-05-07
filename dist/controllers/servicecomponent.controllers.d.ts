import type { Request, Response } from "express";
export declare const bulkUpsertServiceComponents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const replaceServiceComponents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getComponentsByServiceAndTier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateServiceComponent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=servicecomponent.controllers.d.ts.map