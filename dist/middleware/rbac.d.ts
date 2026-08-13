import type { NextFunction, Request, Response } from "express";
export declare const requirePermission: (requiredPermission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rbac.d.ts.map