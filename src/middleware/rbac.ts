import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { User } from "../models/user.model.js";
import { Role } from "../types/rbac.js";

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

export const requirePermission = (
  requiredPermission: string,
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });

        return;
      }

      if (req.user.role !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          message: "Admin access required",
        });

        return;
      }

      const user = await User.findById(
        req.user.userId,
      )
        .select("rbacRoles")
        .populate({
          path: "rbacRoles",
          match: {
            isActive: true,
          },
          select:
            "key isActive isSystem permissions",
          populate: {
            path: "permissions",
            match: {
              isActive: true,
            },
            select: "key isActive",
          },
        })
        .lean();

      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not found",
        });

        return;
      }

      const roles =
        user.rbacRoles as unknown as
        PopulatedRbacRole[];

      if (
        !roles ||
        roles.length === 0
      ) {
        res.status(403).json({
          success: false,
          message:
            "Access denied. No RBAC role assigned",
        });

        return;
      }

      const isSuperAdmin =
        roles.some(
          (role) =>
            role.isSystem &&
            role.key === "SUPER_ADMIN",
        );

      if (isSuperAdmin) {
        next();
        return;
      }

      const hasRequiredPermission =
        roles.some((role) =>
          role.permissions.some(
            (permission) =>
              permission.key ===
              requiredPermission,
          ),
        );

      if (!hasRequiredPermission) {
        res.status(403).json({
          success: false,
          message:
            "Access denied. Missing required permission",
        });

        return;
      }

      next();
    } catch (error) {
      console.error(
        "RBAC permission check failed:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to verify access permission",
      });
    }
  };
};