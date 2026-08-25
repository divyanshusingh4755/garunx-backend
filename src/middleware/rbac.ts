import type { NextFunction, Request, Response } from "express";
import { Role } from "../types/rbac.js";
import { RbacService } from "../services/rbac.service.js";

interface PopulatedPermission {
  key: string;
  isActive: boolean;
}

interface PopulatedRbacRole {
  key: string;
  isActive: boolean;
  isSystem: boolean;
  permissions: PopulatedPermission[];
}

export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      //  Authentication should already have populated req.user.
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // RBAC permissions are only applicable to ADMIN users.
      if (req.user.role !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          message: "Admin access required",
        });
        return;
      }

      // This now goes through Redis. RbacService.getUserAccess() loads from Redis first and falls back to MongoDB.
      const user = await RbacService.getUserAccess(req.user.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          message:
            "User not found",
        });
        return;
      }

      const roles = user.rbacRoles as unknown as PopulatedRbacRole[];

      if (!roles || roles.length === 0) {
        res.status(403).json({
          success: false,
          message: "Access denied. No RBAC role assigned",
        });

        return;
      }

      // SUPER_ADMIN bypass. System SUPER_ADMIN has access regardless of explicit permission.
      const isSuperAdmin = roles.some((role) => role.isActive && role.isSystem && role.key === "SUPER_ADMIN");
      if (isSuperAdmin) { next(); return; }

      // Check required permission against all active roles. getUserAccess() already filters inactive roles/permissions, but keeping the checks here adds another defensive layer.
      const hasRequiredPermission = roles.some((role) => role.isActive && Array.isArray(role.permissions,) && role.permissions.some((permission) => permission.isActive && permission.key === requiredPermission));

      if (!hasRequiredPermission) {
        res.status(403).json({
          success: false,
          message: "Access denied. Missing required permission",
        });
        return;
      }

      next();
    } catch (error) {
      console.error("RBAC permission check failed:", error);

      res.status(500).json({
        success: false,
        message: "Unable to verify access permission",
      });
    }
  };
};