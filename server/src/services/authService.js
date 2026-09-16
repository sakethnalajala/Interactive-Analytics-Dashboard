import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/tokens.js';
import { env } from '../config/env.js';

const MAX_SESSIONS = 5;
/**
 * A rotated refresh token stays usable for a few seconds so that concurrent
 * requests (two tabs, StrictMode, retried network calls) do not trip the
 * reuse detector. Reuse *after* the window is treated as theft.
 */
const ROTATION_GRACE_MS = 10_000;

const isLive = (t, now = Date.now()) => t.expiresAt > now && (!t.usedAt || now - t.usedAt < ROTATION_GRACE_MS);

async function issueTokens(user, userAgent = '') {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400000);

  // Keep only live tokens and cap concurrent devices
  const live = (user.refreshTokens || []).filter((t) => isLive(t)).slice(-(MAX_SESSIONS - 1));
  user.refreshTokens = [...live, { jti, tokenHash: hashToken(refreshToken), expiresAt, userAgent: userAgent.slice(0, 200) }];
  await user.save();

  return { accessToken, refreshToken };
}

export async function login({ email, password }, userAgent) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokens');
  // Same error for unknown email and wrong password — prevents user enumeration
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  const tokens = await issueTokens(user, userAgent);
  return { user: user.toPublic(), ...tokens };
}

export async function refresh(refreshToken, userAgent) {
  if (!refreshToken) throw ApiError.unauthorized('No refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or expired');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive');

  const hash = hashToken(refreshToken);
  const stored = user.refreshTokens.find((t) => t.jti === payload.jti);
  const reusedAfterGrace = stored?.usedAt && Date.now() - stored.usedAt >= ROTATION_GRACE_MS;
  if (!stored || stored.tokenHash !== hash || reusedAfterGrace) {
    // Reuse of a rotated token => possible theft: revoke every session for this user.
    user.refreshTokens = [];
    await user.save();
    throw ApiError.unauthorized('Refresh token reuse detected. Please sign in again.');
  }

  // Rotate: mark the presented token as used (pruned after the grace window), issue a new pair
  if (!stored.usedAt) stored.usedAt = new Date();
  const tokens = await issueTokens(user, userAgent);
  return { user: user.toPublic(), ...tokens };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return; // already invalid — nothing to revoke
  }
  await User.updateOne({ _id: payload.sub }, { $pull: { refreshTokens: { jti: payload.jti } } });
}
