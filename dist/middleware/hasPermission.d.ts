import type { NextFunction, Request, Response } from "express";
import { type Permission } from "../types/rbac.js";
export declare const hasPermission: (requiredPermission: Permission) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=hasPermission.d.ts.map