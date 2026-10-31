import rateLimit from 'express-rate-limit';

const createRateLimiter = (max, windowMs, message = 'Too many requests. Please wait before trying again.') => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
    },
    // In test environment, allow tests to pass unless specifically testing rate limits
    skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true',
  });
};

// 5 requests per 10 min per IP
export const createCaseLimiter = createRateLimiter(5, 10 * 60 * 1000);

// 3 requests per 5 min per IP
export const accuseLimiter = createRateLimiter(3, 5 * 60 * 1000);

// 10 requests per min per IP
export const hintLimiter = createRateLimiter(10, 60 * 1000);

// 20 requests per min per IP
export const clueLimiter = createRateLimiter(20, 60 * 1000);

// General protection: 60 requests per min per IP
export const generalLimiter = createRateLimiter(60, 60 * 1000);
