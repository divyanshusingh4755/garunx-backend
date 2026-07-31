import { RolePermissions, } from "../types/rbac.js";
export const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        const userPermissions = RolePermissions[req.user.role];
        if (!userPermissions.includes(requiredPermission)) {
            res.status(403).json({
                success: false,
                message: "Access denied. Missing permission",
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=hasPermission.js.map