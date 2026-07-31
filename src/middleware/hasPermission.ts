import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  type Permission,
  RolePermissions,
} from "../types/rbac.js";

export const hasPermission = (
  requiredPermission:
    Permission,
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });

      return;
    }

    const userPermissions =
      RolePermissions[
        req.user.role
      ];

    if (
      !userPermissions.includes(
        requiredPermission,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "Access denied. Missing permission",
      });

      return;
    }

    next();
  };
};