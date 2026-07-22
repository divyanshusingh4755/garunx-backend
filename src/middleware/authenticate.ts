import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

import { Role } from "../types/rbac.js";

interface AccessTokenPayload
  extends JwtPayload {
  userId: string;
  role: Role;
}

const isAccessTokenPayload = (
  value: string | JwtPayload,
): value is AccessTokenPayload => {
  if (
    typeof value === "string"
  ) {
    return false;
  }

  return (
    typeof value.userId === "string" &&
    Object.values(Role).includes(
      value.role as Role,
    )
  );
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorization =
    req.headers.authorization;

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required. Please provide a Bearer token.",
    });
  }

  const token =
    authorization.slice(
      "Bearer ".length,
    );

  const secret =
    process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    console.error(
      "JWT_ACCESS_SECRET is not configured",
    );

    return res.status(500).json({
      success: false,
      message:
        "Authentication configuration error",
    });
  }

  try {
    const decoded =
      jwt.verify(
        token,
        secret,
      );

    if (
      !isAccessTokenPayload(
        decoded,
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid access token payload",
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired access token",
    });
  }
};

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authorization =
    req.headers.authorization;

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return next();
  }

  const secret =
    process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    return next();
  }

  const token =
    authorization.slice(
      "Bearer ".length,
    );

  try {
    const decoded =
      jwt.verify(
        token,
        secret,
      );

    if (
      isAccessTokenPayload(
        decoded,
      )
    ) {
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
    }
  } catch {
    // Authentication is optional,
    // so continue as unauthenticated.
  }

  return next();
};
