import type { Request, Response, NextFunction } from "express";
import { Role } from "../types/rbac.js";
export declare const authorizeRoles: (...allowedRoles: Role[]) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=authorizeRoles.d.ts.map