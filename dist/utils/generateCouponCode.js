import crypto from "crypto";
export const generateCouponCode = (prefix) => {
    return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};
//# sourceMappingURL=generateCouponCode.js.map