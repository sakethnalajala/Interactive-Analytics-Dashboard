import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Verifies the Bearer access token and loads a fresh user (so deactivation is immediate). */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token', {
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or no longer exists');
  req.user = user;
  next();
});

/** Role gate. Usage: authorize('admin', 'super_admin'). */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

/** Convenience role groups used across routes. */
export const ROLE_GROUPS = {
  exporters: ['super_admin', 'admin', 'analyst'],
  editors: ['super_admin', 'admin'],
  owners: ['super_admin'],
};
