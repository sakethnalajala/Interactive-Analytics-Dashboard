import { z } from 'zod';
import { ROLES, DATE_PRESETS } from '../models/User.js';
import { CATEGORIES } from '../models/Product.js';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../models/Order.js';
import { SEGMENTS } from '../models/Customer.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

// ---------- shared query pieces ----------
export const rangeQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  granularity: z.enum(['day', 'week', 'month']).optional(),
});

const listBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
};

// ---------- auth ----------
export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(120),
  password: z.string().min(1, 'Password is required').max(128),
});

// ---------- profile ----------
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    jobTitle: z.string().trim().max(80).optional(),
    avatarColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    preferences: z
      .object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        defaultDateRange: z.enum(DATE_PRESETS).optional(),
        compactTables: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((d) => d.currentPassword !== d.newPassword, { message: 'New password must differ from the current one', path: ['newPassword'] });

// ---------- settings / team ----------
export const updateSettingsSchema = z
  .object({
    orgName: z.string().trim().min(2).max(80).optional(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).optional(),
    timezone: z.string().trim().max(64).optional(),
    fiscalYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).max(10000).optional(),
    weekStartsOn: z.enum(['monday', 'sunday']).optional(),
  })
  .strict();

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password,
  role: z.enum(ROLES),
  jobTitle: z.string().trim().max(80).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
    jobTitle: z.string().trim().max(80).optional(),
    password: password.optional(),
  })
  .strict();

// ---------- products ----------
export const productListQuery = z.object({
  ...listBase,
  sort: z.enum(['name', 'price', 'stock', 'rating', 'category', 'createdAt', 'sku']).default('createdAt'),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(['active', 'archived', 'low_stock']).optional(),
});

export const productBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9-]+$/, 'SKU may contain letters, numbers and dashes'),
  category: z.enum(CATEGORIES),
  price: z.coerce.number().min(0).max(1_000_000),
  cost: z.coerce.number().min(0).max(1_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  description: z.string().trim().max(1000).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const productPatchSchema = productBodySchema.partial().strict();

// ---------- customers ----------
export const customerListQuery = z.object({
  ...listBase,
  sort: z.enum(['name', 'totalSpent', 'orderCount', 'createdAt', 'lastOrderAt', 'country']).default('createdAt'),
  segment: z.enum(SEGMENTS).optional(),
  country: z.string().trim().max(60).optional(),
});

// ---------- orders ----------
export const orderListQuery = z.object({
  ...listBase,
  ...rangeQuery.shape,
  sort: z.enum(['createdAt', 'total', 'status', 'customerName', 'orderNumber']).default('createdAt'),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

// ---------- reports ----------
export const REPORT_TYPES = ['revenue', 'orders', 'customers', 'products', 'engagement'];
export const reportQuery = z.object({
  ...rangeQuery.shape,
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  segment: z.enum(SEGMENTS).optional(),
  country: z.string().trim().max(60).optional(),
});

export const idParam = z.object({ id: objectId });
