import type { NextFunction, Request, Response } from "express";
import { Role } from "../types/rbac.js";
export declare const authorizeRoles: (...allowedRoles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorizeRoles.d.ts.map