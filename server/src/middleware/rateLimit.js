import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const json429 = (message) => ({ success: false, error: { code: 'RATE_LIMITED', message } });

/** Brute-force protection on credential endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429('Too many login attempts. Please try again in 15 minutes.'),
});

/** General API limiter — generous, protects against runaway clients. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 10000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429('Too many requests. Please slow down.'),
});
