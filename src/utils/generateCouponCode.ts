import crypto from "crypto";

export const generateCouponCode = (prefix: string) => {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};
