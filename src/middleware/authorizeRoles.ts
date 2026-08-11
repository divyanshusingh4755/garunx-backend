import type { NextFunction, Request, Response } from "express";

import { Role } from "../types/rbac.js";

export const authorizeRoles = (...allowedRoles: Role[]) => {
  const allowedRoleSet = new Set<Role>(allowedRoles);

  return (req: Request, res: Response, next: NextFunction): void => {
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
