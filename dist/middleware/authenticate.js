import jwt, {} from "jsonwebtoken";
import { Role, } from "../types/rbac.js";
const roleValues = new Set(Object.values(Role));
const isAccessTokenPayload = (value) => {
    if (typeof value === "string") {
        return false;
    }
    return (typeof value.userId ===
        "string" &&
        value.userId.length > 0 &&
        typeof value.role ===
            "string" &&
        roleValues.has(value.role));
};
const getAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    return secret;
};
const extractBearerToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [scheme, token, ...rest] = authorization
        .trim()
        .split(/\s+/);
    if (scheme !== "Bearer" ||
        !token ||
        rest.length > 0) {
        return null;
    }
    return token;
};
const verifyAccessToken = (token, secret) => {
    const decoded = jwt.verify(token, secret, {
        algorithms: [
            "HS256",
        ],
    });
    return isAccessTokenPayload(decoded)
        ? decoded
        : null;
};
export const authenticate = (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
        res.status(401).json({
            success: false,
            message: "Authentication required. Please provide a valid Bearer token.",
        });
        return;
    }
    let secret;
    try {
        secret =
            getAccessSecret();
    }
    catch (error) {
        console.error(error instanceof Error
            ? error.message
            : "Authentication configuration error");
        res.status(500).json({
            success: false,
            message: "Authentication configuration error",
        });
        return;
    }
    try {
        const decoded = verifyAccessToken(token, secret);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: "Invalid access token payload",
            });
            return;
        }
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};
export const optionalAuthenticate = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        next();
        return;
    }
    const token = extractBearerToken(authorization);
    if (!token) {
        res.status(401).json({
            success: false,
            message: "Invalid Bearer token format",
        });
        return;
    }
    let secret;
    try {
        secret =
            getAccessSecret();
    }
    catch (error) {
        console.error(error instanceof Error
            ? error.message
            : "Authentication configuration error");
        res.status(500).json({
            success: false,
            message: "Authentication configuration error",
        });
        return;
    }
    try {
        const decoded = verifyAccessToken(token, secret);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: "Invalid access token payload",
            });
            return;
        }
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};
//# sourceMappingURL=authenticate.js.map