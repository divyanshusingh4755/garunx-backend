import type {
  Request,
} from "express";

export interface ClientInfo {
  userAgent: string;
  ip: string;
}

export const getClientIp = (
  req: Request,
): ClientInfo => {
  const userAgent =
    req.get("User-Agent") ??
    "unknown";

  /*
   * Express resolves req.ip according to the configured
   * trust-proxy setting. Reading x-forwarded-for directly
   * would allow spoofed values when the proxy chain is not
   * interpreted correctly.
   */
  const ip =
    req.ip ||
    req.socket.remoteAddress ||
    "0.0.0.0";

  return {
    userAgent,
    ip,
  };
};