import { Role } from "../types/rbac.js";
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const userRole = req.user.role;
        if (!Object.values(Role).includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Invalid user role",
            });
        }
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this resource",
            });
        }
        return next();
    };
};
//# sourceMappingURL=authorizeRoles.js.map