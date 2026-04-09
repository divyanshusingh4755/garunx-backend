import jwt from 'jsonwebtoken';
export const authenticate = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please provide a token."
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        // Attach the user info to the request object
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }
};
export const optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        // Attach the user info to the request object
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        next();
    }
};
//# sourceMappingURL=authenticate.js.map