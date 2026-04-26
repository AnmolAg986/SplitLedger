import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for dev stability
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for dev stability
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' }
});

export const nudgeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour (as an IP-based backup to the 24h DB limit)
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many nudges sent, please try again later.' }
});
