import rateLimit from "express-rate-limit";

const fifteenMinutes = 15 * 60 * 1000;

export const authRateLimiter = rateLimit({
  windowMs: fifteenMinutes,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: fifteenMinutes,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 15 minutes.",
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: fifteenMinutes,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again after 15 minutes.",
  },
});
