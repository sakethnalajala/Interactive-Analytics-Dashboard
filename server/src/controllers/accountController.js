import { User, ROLES } from '../models/User.js';
import { Setting } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ---------------------------------------------------------------- profile
export async function getProfile(req, res) {
  ok(res, { user: req.user.toPublic() });
}

export async function updateProfile(req, res) {
  const { preferences, ...rest } = req.body;
  Object.assign(req.user, rest);
  if (preferences) Object.assign(req.user.preferences, preferences);
  await req.user.save();
  ok(res, { user: req.user.toPublic() });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash +refreshTokens');
  if (!(await user.comparePassword(req.body.currentPassword))) throw ApiError.badRequest('Current password is incorrect', [{ path: 'currentPassword', message: 'Incorrect password' }]);
  user.passwordHash = await User.hashPassword(req.body.newPassword);
  user.refreshTokens = []; // sign out every other device
  await user.save();
  ok(res, { message: 'Password updated. Other devices have been signed out.' });
}

// ---------------------------------------------------------------- settings
export async function getSettings(_req, res) {
  const s = await Setting.get();
  ok(res, { settings: pickSettings(s) });
}

export async function updateSettings(req, res) {
  const s = await Setting.get();
  Object.assign(s, req.body);
  await s.save();
  ok(res, { settings: pickSettings(s) });
}

function pickSettings(s) {
  return {
    orgName: s.orgName,
    currency: s.currency,
    timezone: s.timezone,
    fiscalYearStartMonth: s.fiscalYearStartMonth,
    lowStockThreshold: s.lowStockThreshold,
    weekStartsOn: s.weekStartsOn,
    updatedAt: s.updatedAt,
  };
}

// ---------------------------------------------------------------- team (super_admin)
export async function listUsers(_req, res) {
  const users = await User.find().sort({ createdAt: 1 });
  ok(res, { users: users.map((u) => u.toPublic()), roles: ROLES });
}

export async function createUser(req, res) {
  const exists = await User.findOne({ email: req.body.email.toLowerCase() });
  if (exists) throw ApiError.conflict('A user with this email already exists');
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    jobTitle: req.body.jobTitle || '',
    passwordHash: await User.hashPassword(req.body.password),
    avatarColor: ['#4318FF', '#39B8FF', '#05CD99', '#FFB547', '#EE5D50'][Math.floor(Math.random() * 5)],
  });
  ok(res, { user: user.toPublic() }, 201);
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id).select('+refreshTokens +passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && (req.body.role && req.body.role !== 'super_admin')) throw ApiError.badRequest('You cannot demote your own account');
  if (isSelf && req.body.isActive === false) throw ApiError.badRequest('You cannot deactivate your own account');

  const { password, ...rest } = req.body;
  Object.assign(user, rest);
  if (password) {
    user.passwordHash = await User.hashPassword(password);
    user.refreshTokens = [];
  }
  if (rest.isActive === false || rest.role) user.refreshTokens = []; // force re-login on privilege change
  await user.save();
  ok(res, { user: user.toPublic() });
}
