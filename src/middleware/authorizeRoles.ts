import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { Role } from "../types/rbac.js";

export const authorizeRoles = (
    ...allowedRoles: Role[]
) => {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required",
            });
        }

        const userRole = req.user.role;

        if (
            !Object.values(Role).includes(
                userRole as Role,
            )
        ) {
            return res.status(403).json({
                success: false,
                message: "Invalid user role",
            });
        }

        if (
            !allowedRoles.includes(
                userRole as Role,
            )
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to access this resource",
            });
        }

        return next();
    };
};