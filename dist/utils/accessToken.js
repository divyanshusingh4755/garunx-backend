import jwt, {} from "jsonwebtoken";
import { Role } from "../types/rbac.js";
const roleValues = new Set(Object.values(Role));
const isAccessTokenPayload = (value) => {
    if (typeof value === "string") {
        return false;
    }
    return (typeof value.userId === "string" && value.userId.length > 0 && typeof value.role === "string" && roleValues.has(value.role));
};
export const getAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    return secret;
};
export const verifyAccessToken = (token) => {
    const secret = getAccessSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    return isAccessTokenPayload(decoded) ? decoded : null;
};
//# sourceMappingURL=accessToken.js.map