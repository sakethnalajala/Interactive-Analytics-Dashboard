import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL });
}

export function signRefreshToken(user) {
  // jti identifies a specific refresh token so it can be rotated / revoked individually
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: String(user._id), jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  });
  return { token, jti };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Only a hash of the refresh token is persisted, so a DB leak cannot be replayed.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const REFRESH_COOKIE = 'refreshToken';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
