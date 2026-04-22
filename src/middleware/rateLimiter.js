/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests from a single IP
 */

const rateLimit = require('express-rate-limit');

// Skip rate limiting in development (set NODE_ENV=development or RATE_LIMIT_DISABLED=true)
const skipRateLimit = () =>
  process.env.NODE_ENV === 'development' || process.env.RATE_LIMIT_DISABLED === 'true';

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipRateLimit,
});

/**
 * Rate limiter for password reset
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
};
