import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate, authorize, ROLE_GROUPS } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';
import { publicDemoAccounts } from '../services/demoService.js';
import * as auth from '../controllers/authController.js';
import * as analytics from '../controllers/analyticsController.js';
import * as data from '../controllers/dataController.js';
import * as reports from '../controllers/reportController.js';
import * as account from '../controllers/accountController.js';
import * as s from '../validation/schemas.js';

const router = Router();
const exporters = authorize(...ROLE_GROUPS.exporters);
const editors = authorize(...ROLE_GROUPS.editors);
const owners = authorize(...ROLE_GROUPS.owners);
const range = validate(s.rangeQuery, 'query');
const id = validate(s.idParam, 'params');

// ---- health
const COMMIT = (process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7);
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString(), commit: COMMIT, allowedOrigins: env.clientOrigins.length } }));

// ---- auth (public)
router.post('/auth/login', authLimiter, validate(s.loginSchema), h(auth.login));
router.post('/auth/refresh', h(auth.refresh));
router.post('/auth/logout', h(auth.logout));
// Demo role cards for the login page — passwords come from env vars, never from frontend code
router.get('/auth/demo-accounts', (_req, res) => res.json({ success: true, data: { enabled: env.demoLoginEnabled, accounts: publicDemoAccounts() } }));

// Password change lives under /auth so the refresh cookie (Path=/api/auth) accompanies it and the
// current device's session can be preserved while every other device is signed out.
router.patch('/auth/password', authenticate, authLimiter, validate(s.changePasswordSchema), h(account.changePassword));

// Everything below requires a valid access token
router.use(authenticate);
router.get('/auth/me', h(auth.me));

// ---- dashboards
router.get('/dashboard/overview', range, h(analytics.overview));
router.get('/analytics/engagement', range, h(analytics.engagement));
router.get('/analytics/funnel', range, h(analytics.funnel));
router.get('/revenue', range, h(analytics.revenue));
router.get('/revenue/trend', range, h(analytics.revenueTrend));

// ---- customers
router.get('/customers/stats', range, h(analytics.customerStats));
router.get('/customers/filters', h(data.customerFilters));
router.get('/customers/export', exporters, validate(s.customerListQuery, 'query'), h(data.exportCustomers));
router.get('/customers', validate(s.customerListQuery, 'query'), h(data.customers));
router.get('/customers/:id', id, h(data.customer));

// ---- products
router.get('/products/stats', range, h(analytics.productStats));
router.get('/products/filters', h(data.productFilters));
router.get('/products/export', exporters, validate(s.productListQuery, 'query'), h(data.exportProducts));
router.get('/products', validate(s.productListQuery, 'query'), h(data.products));
router.post('/products', editors, validate(s.productBodySchema), h(data.createProduct));
router.patch('/products/:id', editors, id, validate(s.productPatchSchema), h(data.updateProduct));
router.delete('/products/:id', editors, id, h(data.archiveProduct));

// ---- orders
router.get('/orders/stats', range, h(analytics.orderStats));
router.get('/orders/filters', h(data.orderFilters));
router.get('/orders/export', exporters, validate(s.orderListQuery, 'query'), h(data.exportOrders));
router.get('/orders', validate(s.orderListQuery, 'query'), h(data.orders));
router.get('/orders/:id', id, h(data.order));
router.patch('/orders/:id/status', editors, id, validate(s.orderStatusSchema), h(data.updateOrderStatus));

// ---- reports
router.get('/reports/types', h(reports.types));
router.get('/reports/:type/export', exporters, validate(s.reportQuery, 'query'), h(reports.exportReport));
router.get('/reports/:type', validate(s.reportQuery, 'query'), h(reports.report));

// ---- profile
router.get('/profile', h(account.getProfile));
router.patch('/profile', validate(s.updateProfileSchema), h(account.updateProfile));
router.patch('/profile/password', authLimiter, validate(s.changePasswordSchema), h(account.changePassword)); // legacy alias (cookie not sent here → signs out all devices)

// ---- settings & team
router.get('/settings', h(account.getSettings));
router.patch('/settings', editors, validate(s.updateSettingsSchema), h(account.updateSettings));
router.get('/settings/users', owners, h(account.listUsers));
router.post('/settings/users', owners, validate(s.createUserSchema), h(account.createUser));
router.patch('/settings/users/:id', owners, id, validate(s.updateUserSchema), h(account.updateUser));

export default router;
