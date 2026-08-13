import { Role } from "../types/rbac.js";
import { requirePermission } from "./rbac.js";
export const requireAdminPermission = (permission) => {
    const permissionMiddleware = requirePermission(permission);
    return (req, res, next) => {
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
        return permissionMiddleware(req, res, next);
    };
};
//# sourceMappingURL=requireAdminPermission.js.map