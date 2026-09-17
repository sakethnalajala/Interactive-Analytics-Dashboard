/**
 * Demo accounts — one per role, used by the login page's "Sign in as a demo role" cards.
 *
 * Passwords are never hard-coded in the frontend. Each role's password comes from an
 * environment variable (DEMO_PASSWORD_<ROLE>). At start-up `syncDemoPasswords()` makes the
 * database match those variables (bcrypt-hashed), so an administrator rotates a demo
 * password by changing the variable and restarting — no manual DB edits. Outside production
 * a shared fallback keeps `npm run dev` working with zero configuration.
 */
import { env } from '../config/env.js';
import { User } from '../models/User.js';

const DEV_FALLBACK_PASSWORD = 'Password123';

export const DEMO_ACCOUNTS = [
  { role: 'super_admin', label: 'Super Admin', email: 'superadmin@demo.com', name: 'Saketh Nalajala', jobTitle: 'Head of Analytics', hint: 'All dashboards · export · edit · manage team', envKey: 'DEMO_PASSWORD_SUPER_ADMIN' },
  { role: 'admin', label: 'Admin', email: 'admin@demo.com', name: 'Priya Raman', jobTitle: 'Operations Manager', hint: 'All dashboards · export · edit products & orders', envKey: 'DEMO_PASSWORD_ADMIN' },
  { role: 'analyst', label: 'Analyst', email: 'analyst@demo.com', name: 'Daniel Okafor', jobTitle: 'Data Analyst', hint: 'All dashboards · CSV export', envKey: 'DEMO_PASSWORD_ANALYST' },
  { role: 'viewer', label: 'Viewer', email: 'viewer@demo.com', name: 'Emma Laurent', jobTitle: 'Marketing Associate', hint: 'All dashboards · read-only', envKey: 'DEMO_PASSWORD_VIEWER' },
];

/** The configured password for a demo role, or null when none is published (production without env vars). */
export function demoPasswordFor(role) {
  const account = DEMO_ACCOUNTS.find((a) => a.role === role);
  if (!account) return null;
  return env[account.envKey] || (env.isProd ? null : DEV_FALLBACK_PASSWORD);
}

/** Shape returned to the login page. Passwords are included only when the demo login is enabled. */
export function publicDemoAccounts() {
  if (!env.demoLoginEnabled) return [];
  return DEMO_ACCOUNTS.map(({ role, label, email, hint }) => ({ role, label, email, hint, password: demoPasswordFor(role) }));
}

/**
 * Make each demo user's stored hash match its configured password. Only accounts whose
 * password is configured are touched; hashes are compared with bcrypt first so unchanged
 * passwords produce no writes. Rotated accounts have their refresh tokens revoked.
 */
export async function syncDemoPasswords({ log = console.log } = {}) {
  let updated = 0;
  for (const account of DEMO_ACCOUNTS) {
    const password = demoPasswordFor(account.role);
    if (!password) continue;
    const user = await User.findOne({ email: account.email }).select('+passwordHash +refreshTokens');
    if (!user) continue;
    if (await user.comparePassword(password)) continue;
    user.passwordHash = await User.hashPassword(password);
    user.refreshTokens = [];
    await user.save();
    updated += 1;
  }
  if (updated) log(`✔ demo passwords synced (${updated} account${updated === 1 ? '' : 's'} updated)`);
  return updated;
}
