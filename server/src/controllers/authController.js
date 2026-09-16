import * as authService from '../services/authService.js';
import { REFRESH_COOKIE, refreshCookieOptions } from '../utils/tokens.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req.get('user-agent'));
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  ok(res, { user, accessToken });
}

export async function refresh(req, res) {
  const { user, accessToken, refreshToken } = await authService.refresh(req.cookies?.[REFRESH_COOKIE], req.get('user-agent'));
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  ok(res, { user, accessToken });
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  ok(res, { message: 'Signed out' });
}

export async function me(req, res) {
  ok(res, { user: req.user.toPublic() });
}
