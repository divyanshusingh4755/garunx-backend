import { randomBytes } from "node:crypto";

const normalizePrefix = (prefix: string): string => {
  const normalized = prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(
      "Coupon prefix must contain at least one alphanumeric character",
    );
  }

  return normalized;
};

export const generateCouponCode = (prefix: string): string => {
  return `${normalizePrefix(prefix)}-${randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

export const generateSlug = (name: string): string => {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const generateUniqueCode = (): string => {
  /*
   * Nine random Base64URL characters provide considerably
   * better collision resistance than timestamp + Math.random.
   */
  return randomBytes(7)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 9)
    .toUpperCase();
};
