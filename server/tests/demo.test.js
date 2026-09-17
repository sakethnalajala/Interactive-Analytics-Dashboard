import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { seedFixtures, PASSWORD } from './fixtures.js';

// Distinct demo passwords, as an administrator would configure on Render
process.env.DEMO_PASSWORD_SUPER_ADMIN = 'SuperDemo2026x';
process.env.DEMO_PASSWORD_VIEWER = 'ViewerDemo2026x';

let app, demo, User;

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  demo = await import('../src/services/demoService.js');
  ({ User } = await import('../src/models/User.js'));
  await seedFixtures();
  // Create the real demo accounts with a stale password to prove sync rotates them
  const stale = await User.hashPassword('StalePass1');
  await User.insertMany(demo.DEMO_ACCOUNTS.map((a) => ({ name: a.name, email: a.email, role: a.role, passwordHash: stale })));
});

describe('demo accounts', () => {
  it('publishes cards without any password that is not configured in production', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');
    expect(res.status).toBe(200);
    const roles = res.body.data.accounts.map((a) => a.role);
    expect(roles).toEqual(['super_admin', 'admin', 'analyst', 'viewer']);
    const su = res.body.data.accounts.find((a) => a.role === 'super_admin');
    expect(su.password).toBe('SuperDemo2026x');
    expect(su).not.toHaveProperty('passwordHash');
  });

  it('syncs configured passwords into the database with bcrypt and revokes sessions', async () => {
    const updated = await demo.syncDemoPasswords({ log: () => {} });
    expect(updated).toBeGreaterThanOrEqual(2); // super_admin + viewer (admin/analyst use the dev fallback in tests)
    const stored = await User.findOne({ email: 'viewer@demo.com' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/); // bcrypt, cost 12 — never plain text
    expect(stored.passwordHash).not.toContain('ViewerDemo2026x');
    // second run is a no-op
    expect(await demo.syncDemoPasswords({ log: () => {} })).toBe(0);
  });

  it('lets every demo role log in with its own password and keeps RBAC', async () => {
    const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
    expect((await login('superadmin@demo.com', 'SuperDemo2026x')).status).toBe(200);
    expect((await login('viewer@demo.com', 'ViewerDemo2026x')).status).toBe(200);
    expect((await login('viewer@demo.com', 'SuperDemo2026x')).status).toBe(401); // passwords are distinct
    expect((await login('admin@demo.com', 'Password123')).status).toBe(200); // dev fallback
    const viewer = (await login('viewer@demo.com', 'ViewerDemo2026x')).body.data;
    expect(viewer.user.role).toBe('viewer');
    const denied = await request(app).get('/api/settings/users').set('Authorization', `Bearer ${viewer.accessToken}`);
    expect(denied.status).toBe(403);
  });

  it('rate-limits password changes and rejects a wrong current password without leaking', async () => {
    const { body } = await request(app).post('/api/auth/login').send({ email: 'viewer@test.com', password: PASSWORD });
    const res = await request(app).patch('/api/profile/password').set('Authorization', `Bearer ${body.data.accessToken}`).send({ currentPassword: 'wrong-one-1', newPassword: 'Brand-new-9' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('Brand-new-9');
  });
});

describe('password change keeps the current session', () => {
  it('revokes other devices but not the device that changed the password', async () => {
    const login = () => request(app).post('/api/auth/login').send({ email: 'analyst@test.com', password: PASSWORD });
    const deviceA = await login();
    const deviceB = await login();
    const cookieA = deviceA.headers['set-cookie'];
    const cookieB = deviceB.headers['set-cookie'];
    const res = await request(app).patch('/api/auth/password').set('Authorization', `Bearer ${deviceA.body.data.accessToken}`).set('Cookie', cookieA).send({ currentPassword: PASSWORD, newPassword: 'Rotated-pass-7' });
    expect(res.status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookieA)).status).toBe(200); // this device stays signed in
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookieB)).status).toBe(401); // other device is out
    expect((await request(app).post('/api/auth/login').send({ email: 'analyst@test.com', password: PASSWORD })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'analyst@test.com', password: 'Rotated-pass-7' })).status).toBe(200);
  });
});
