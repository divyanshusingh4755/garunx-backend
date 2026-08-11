import { Role } from "../types/rbac.js";
export const authorizeRoles = (...allowedRoles) => {
    const allowedRoleSet = new Set(allowedRoles);
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        if (!allowedRoleSet.has(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "You are not authorized to access this resource",
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=authorizeRoles.js.map