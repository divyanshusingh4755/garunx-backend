import { type Request, type Response, type NextFunction } from "express";
declare const router: import("express-serve-static-core").Router;
export declare const componentItemValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined))[];
export declare const updateComponentItemValidation: (import("express-validator").ValidationChain | ((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined))[];
export default router;
//# sourceMappingURL=componentitem.routes.d.ts.map