import jwt, {type JwtPayload } from "jsonwebtoken";
import { Role } from "../types/rbac.js";

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  role: Role;
}

const roleValues = new Set<string>(Object.values(Role));

const isAccessTokenPayload = (value: string | JwtPayload): value is AccessTokenPayload => {
  if (typeof value === "string") {
    return false;
  }

  return (
    typeof value.userId === "string" && value.userId.length > 0 && typeof value.role === "string" && roleValues.has(value.role)
  )
}

export const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured")
  }

  return secret
}

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  const secret = getAccessSecret();
  const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  return isAccessTokenPayload(decoded) ? decoded : null;
}
