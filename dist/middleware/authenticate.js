import { verifyAccessToken } from "../utils/accessToken.js";
const extractBearerToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
    if (scheme !== "Bearer" || !token || rest.length > 0) {
        return null;
    }
    return token;
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
        const decoded = verifyAccessToken(token);
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
    catch (error) {
        if (error instanceof Error && error.message === "JWT_ACCESS_SECRET is not configured") {
            res.status(500).json({
                success: false,
                message: "Authentication configuration error"
            });
            return;
        }
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
    try {
        const decoded = verifyAccessToken(token);
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
    catch (error) {
        if (error instanceof Error && error.message === "JWT_ACCESS_SECRET is not configured") {
            res.status(500).json({
                success: false,
                message: "Authentication configuration error"
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};
//# sourceMappingURL=authenticate.js.map