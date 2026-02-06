import {} from "express";
import { Role, RolePermissions } from "../types/rbac.js";
export const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        // Get Permission
        const userRole = user.role;
        const userPermissions = RolePermissions[userRole] || [];
        // 2. Merge with user-specific permissions from DB
        // const totalPermissions = [...userPermissions, ...(user.customPermissions || [])];
        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({
                success: false,
                message: "Access Denied. Missing Permission"
            });
        }
        next();
    };
};
//# sourceMappingURL=hasPermission.js.map