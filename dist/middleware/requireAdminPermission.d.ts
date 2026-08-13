import type { NextFunction, Request, Response } from "express";
export declare const requireAdminPermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void> | undefined;
//# sourceMappingURL=requireAdminPermission.d.ts.map