import { type Request, type Response, type NextFunction } from "express";
export declare const hasPermission: (requiredPermission: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=hasPermission.d.ts.map