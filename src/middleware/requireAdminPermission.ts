import type {
    NextFunction,
    Request,
    Response,
} from "express";

import { Role } from "../types/rbac.js";
import { requirePermission } from "./rbac.js";

export const requireAdminPermission = (
    permission: string,
) => {
    const permissionMiddleware =
        requirePermission(permission);

    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });

            return;
        }

        if (req.user.role !== Role.ADMIN) {
            next();
            return;
        }

        return permissionMiddleware(
            req,
            res,
            next,
        );
    };
};