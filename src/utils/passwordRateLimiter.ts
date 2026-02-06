import rateLimit from 'express-rate-limit';

export const passwordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        success: false,
        message: "Too many password reset attempts. Please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false
})