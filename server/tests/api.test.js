import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { seedFixtures, PASSWORD } from './fixtures.js';

let app;
const RANGE = { from: '2026-01-10', to: '2026-01-20' };
const tokens = {};

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res;
}
const auth = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  await seedFixtures();
  for (const role of ['super', 'admin', 'analyst', 'viewer']) tokens[role] = (await login(`${role}@test.com`)).body.data.accessToken;
});

describe('auth', () => {
  it('rejects invalid credentials with a generic message', async () => {
    const res = await login('viewer@test.com').then(() => request(app).post('/api/auth/login').send({ email: 'viewer@test.com', password: 'nope' }));
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@test.com', password: 'nope' });
    expect(unknown.body.error.message).toBe('Invalid email or password');
  });

  it('validates the login body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.path)).toEqual(['email', 'password']);
  });

  it('logs in, sets an httpOnly refresh cookie and never exposes the hash', async () => {
    const res = await login('viewer@test.com');
    expect(res.status).toBe(200);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('refreshTokens');
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/refreshToken=/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it('blocks deactivated accounts', async () => {
    const res = await login('inactive@test.com');
    expect(res.status).toBe(403);
  });

  it('rotates refresh tokens and detects reuse after the grace window', async () => {
    const first = await login('analyst@test.com');
    const cookie = first.headers['set-cookie'];
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r1.status).toBe(200);
    expect(r1.body.data.accessToken).toBeTruthy();
    // Within the grace window a concurrent replay is tolerated
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r2.status).toBe(200);
    // Logout revokes the rotated token
    await request(app).post('/api/auth/logout').set('Cookie', r2.headers['set-cookie']);
    const r3 = await request(app).post('/api/auth/refresh').set('Cookie', r2.headers['set-cookie']);
    expect(r3.status).toBe(401);
  });

  it('requires a token for protected routes', async () => {
    const res = await request(app).get('/api/dashboard/overview');
    expect(res.status).toBe(401);
    const bad = await request(app).get('/api/dashboard/overview').set('Authorization', 'Bearer nope');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('TOKEN_INVALID');
  });
});

describe('role-based access', () => {
  it('viewer cannot export, edit or manage', async () => {
    expect((await request(app).get('/api/orders/export').set(auth('viewer'))).status).toBe(403);
    expect((await request(app).post('/api/products').set(auth('viewer')).send({})).status).toBe(403);
    expect((await request(app).patch('/api/settings').set(auth('viewer')).send({ orgName: 'X' })).status).toBe(403);
    expect((await request(app).get('/api/settings/users').set(auth('viewer'))).status).toBe(403);
  });

  it('analyst can export but not edit', async () => {
    expect((await request(app).get('/api/customers/export').set(auth('analyst'))).status).toBe(200);
    expect((await request(app).delete('/api/products/000000000000000000000000').set(auth('analyst'))).status).toBe(403);
  });

  it('admin can edit but not manage the team', async () => {
    expect((await request(app).patch('/api/settings').set(auth('admin')).send({ orgName: 'Acme' })).status).toBe(200);
    expect((await request(app).get('/api/settings/users').set(auth('admin'))).status).toBe(403);
  });

  it('super admin can manage the team but not demote themselves', async () => {
    const list = await request(app).get('/api/settings/users').set(auth('super'));
    expect(list.status).toBe(200);
    const me = list.body.data.users.find((u) => u.email === 'super@test.com');
    const res = await request(app).patch(`/api/settings/users/${me.id}`).set(auth('super')).send({ role: 'viewer' });
    expect(res.status).toBe(400);
  });
});

describe('analytics correctness', () => {
  it('computes revenue KPIs from revenue-counting statuses only', async () => {
    const res = await request(app).get('/api/revenue').set(auth('viewer')).query(RANGE);
    expect(res.status).toBe(200);
    const k = res.body.data.kpis;
    expect(k.revenue.value).toBe(300); // 100 delivered + 200 shipped; cancelled/refunded excluded
    expect(k.orders.value).toBe(4); // all orders in range regardless of status
    expect(k.aov.value).toBe(150);
    expect(k.refunds.value).toBe(50);
    expect(k.netRevenue.value).toBe(250);
    expect(k.revenue.previous).toBe(200); // previous period (Dec 30 – Jan 9) has ORD-5
    expect(k.revenue.change).toBe(50);
    // gross margin: revenue 300, cost 60 + 80 = 140 → 53.3%
    expect(k.grossMargin.value).toBe(53.3);
  });

  it('breaks revenue down by category with shares that sum to 100', async () => {
    const res = await request(app).get('/api/revenue').set(auth('viewer')).query(RANGE);
    const cats = res.body.data.byCategory;
    expect(cats.find((c) => c.category === 'Apparel').revenue).toBe(200);
    expect(cats.find((c) => c.category === 'Electronics').revenue).toBe(100);
    expect(cats.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100, 0);
  });

  it('fills the trend with every day in range (no gaps)', async () => {
    const res = await request(app).get('/api/revenue/trend').set(auth('viewer')).query(RANGE);
    expect(res.body.data.trend).toHaveLength(11);
    expect(res.body.data.trend[0].date).toBe('2026-01-10');
    expect(res.body.data.trend.find((p) => p.date === '2026-01-15').revenue).toBe(200);
    expect(res.body.data.meta.granularity).toBe('day');
  });

  it('computes funnel and conversion from sessions', async () => {
    const res = await request(app).get('/api/analytics/funnel').set(auth('viewer')).query(RANGE);
    expect(res.body.data.stages.map((s) => s.count)).toEqual([10, 6, 4, 3, 2]);
    const eng = await request(app).get('/api/analytics/engagement').set(auth('viewer')).query(RANGE);
    expect(eng.body.data.kpis.sessions.value).toBe(10);
    expect(eng.body.data.kpis.conversionRate.value).toBe(20);
    expect(eng.body.data.kpis.activeUsers.value).toBe(1);
    expect(eng.body.data.kpis.newUsers.value).toBe(1); // Bob joined Jan 12
    expect(eng.body.data.heatmap).toHaveLength(7);
  });

  it('rejects an inverted or oversized range', async () => {
    expect((await request(app).get('/api/revenue').set(auth('viewer')).query({ from: '2026-02-01', to: '2026-01-01' })).status).toBe(400);
    expect((await request(app).get('/api/revenue').set(auth('viewer')).query({ from: '2020-01-01', to: '2026-01-01' })).status).toBe(400);
    expect((await request(app).get('/api/revenue').set(auth('viewer')).query({ from: 'yesterday' })).status).toBe(400);
  });
});

describe('lists: search, filter, sort, paginate', () => {
  it('paginates and sorts orders server-side', async () => {
    const res = await request(app).get('/api/orders').set(auth('viewer')).query({ limit: 5, page: 1, sort: 'total', order: 'desc' });
    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 5, total: 6, pages: 2 });
    expect(res.body.data.items[0].total).toBe(200);
    expect(res.body.data.items[0]).not.toHaveProperty('_id');
    const page2 = await request(app).get('/api/orders').set(auth('viewer')).query({ limit: 5, page: 2, sort: 'total', order: 'desc' });
    expect(page2.body.data.items).toHaveLength(1);
  });

  it('searches and filters', async () => {
    const byName = await request(app).get('/api/orders').set(auth('viewer')).query({ search: 'bob' });
    expect(byName.body.data.pagination.total).toBe(3);
    const byStatus = await request(app).get('/api/orders').set(auth('viewer')).query({ status: 'delivered' });
    expect(byStatus.body.data.pagination.total).toBe(2);
    const lowStock = await request(app).get('/api/products').set(auth('viewer')).query({ status: 'low_stock' });
    expect(lowStock.body.data.items.map((p) => p.sku)).toEqual(['WID-0001']);
    const regexSafe = await request(app).get('/api/customers').set(auth('viewer')).query({ search: '.*' });
    expect(regexSafe.body.data.pagination.total).toBe(0); // special chars are escaped, not interpreted
  });

  it('validates list params', async () => {
    const res = await request(app).get('/api/orders').set(auth('viewer')).query({ sort: 'evil', limit: 9999 });
    expect(res.status).toBe(400);
  });
});

describe('mutations', () => {
  it('creates, updates and archives a product with validation', async () => {
    const bad = await request(app).post('/api/products').set(auth('admin')).send({ name: 'x', sku: 'bad sku!', category: 'Nope', price: -1 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.length).toBeGreaterThan(2);

    const created = await request(app).post('/api/products').set(auth('admin')).send({ name: 'New Thing', sku: 'new-0009', category: 'Toys', price: 20, cost: 10, stock: 3 });
    expect(created.status).toBe(201);
    expect(created.body.data.sku).toBe('NEW-0009');

    const dup = await request(app).post('/api/products').set(auth('admin')).send({ name: 'Dup', sku: 'NEW-0009', category: 'Toys', price: 20, cost: 10, stock: 3 });
    expect(dup.status).toBe(409);

    const updated = await request(app).patch(`/api/products/${created.body.data.id}`).set(auth('admin')).send({ price: 25 });
    expect(updated.body.data.price).toBe(25);

    const archived = await request(app).delete(`/api/products/${created.body.data.id}`).set(auth('admin'));
    expect(archived.body.data.isActive).toBe(false);

    const missing = await request(app).patch('/api/products/000000000000000000000000').set(auth('admin')).send({ price: 1 });
    expect(missing.status).toBe(404);
  });

  it('enforces order status transitions and keeps customer totals consistent', async () => {
    const list = await request(app).get('/api/orders').set(auth('admin')).query({ search: 'ORD-6' });
    const id = list.body.data.items[0].id;
    const invalid = await request(app).patch(`/api/orders/${id}/status`).set(auth('admin')).send({ status: 'delivered' });
    expect(invalid.status).toBe(400);
    const ok = await request(app).patch(`/api/orders/${id}/status`).set(auth('admin')).send({ status: 'processing' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.allowedTransitions).toEqual(['shipped', 'cancelled']);
    // pending → processing now counts as revenue, so Bob's totals increase
    const bob = await request(app).get('/api/customers').set(auth('admin')).query({ search: 'bob' });
    expect(bob.body.data.items[0].totalSpent).toBe(50);
    expect(bob.body.data.items[0].orderCount).toBe(1);
  });

  it('changes the password and rejects the old one', async () => {
    const wrong = await request(app).patch('/api/profile/password').set(auth('viewer')).send({ currentPassword: 'nope', newPassword: 'NewPass123' });
    expect(wrong.status).toBe(400);
    const ok = await request(app).patch('/api/profile/password').set(auth('viewer')).send({ currentPassword: PASSWORD, newPassword: 'NewPass123' });
    expect(ok.status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'viewer@test.com', password: PASSWORD })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'viewer@test.com', password: 'NewPass123' })).status).toBe(200);
  });
});

describe('reports & export', () => {
  it('builds a revenue report whose rows match the columns', async () => {
    const res = await request(app).get('/api/reports/revenue').set(auth('viewer')).query(RANGE);
    expect(res.status).toBe(200);
    const { columns, rows, summary } = res.body.data;
    expect(summary.find((s) => s.label === 'Revenue').value).toBe(300);
    expect(rows).toHaveLength(11);
    for (const c of columns) expect(rows[0]).toHaveProperty(c.key);
  });

  it('rejects unknown report types', async () => {
    expect((await request(app).get('/api/reports/secret').set(auth('viewer'))).status).toBe(404);
  });

  it('streams CSV with a BOM, header row and escaped cells', async () => {
    const res = await request(app).get('/api/reports/orders/export').set(auth('analyst')).query(RANGE);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/orders-report_2026-01-10_2026-01-20\.csv/);
    const lines = res.text.split('\r\n').filter(Boolean);
    expect(lines[0].charCodeAt(0)).toBe(0xfeff);
    expect(lines[0].slice(1)).toBe('Order #,Date,Customer,Email,Items,Total,Status,Payment,Channel,Country');
    expect(lines).toHaveLength(1 + 4);
  });
});

describe('errors', () => {
  it('returns a consistent 404 envelope', async () => {
    const res = await request(app).get('/api/nope').set(auth('viewer'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Route GET /api/nope not found' } });
  });

  it('handles malformed JSON and bad ids', async () => {
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"broken');
    expect(bad.status).toBe(400);
    const id = await request(app).get('/api/orders/not-an-id').set(auth('viewer'));
    expect(id.status).toBe(400);
  });
});
