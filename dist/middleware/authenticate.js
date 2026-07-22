import jwt, {} from "jsonwebtoken";
import { Role } from "../types/rbac.js";
const isAccessTokenPayload = (value) => {
    if (typeof value === "string") {
        return false;
    }
    return (typeof value.userId === "string" &&
        Object.values(Role).includes(value.role));
};
export const authenticate = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please provide a Bearer token.",
        });
    }
    const token = authorization.slice("Bearer ".length);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        console.error("JWT_ACCESS_SECRET is not configured");
        return res.status(500).json({
            success: false,
            message: "Authentication configuration error",
        });
    }
    try {
        const decoded = jwt.verify(token, secret);
        if (!isAccessTokenPayload(decoded)) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token payload",
            });
        }
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        return next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};
export const optionalAuthenticate = (req, _res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        return next();
    }
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        return next();
    }
    const token = authorization.slice("Bearer ".length);
    try {
        const decoded = jwt.verify(token, secret);
        if (isAccessTokenPayload(decoded)) {
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
            };
        }
    }
    catch {
        // Authentication is optional,
        // so continue as unauthenticated.
    }
    return next();
};
//# sourceMappingURL=authenticate.js.map