import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),
  CLIENT_URL: z.string().default('http://localhost:5180'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast: a misconfigured server must not start.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  // Comma-separated origins. Trailing slashes/paths are stripped and matching is
  // case-insensitive because a browser Origin header is always just scheme://host[:port].
  // A "*" wildcard is allowed in the host, e.g. https://my-app-*.vercel.app for previews.
  clientOrigins: parsed.data.CLIENT_URL.split(',')
    .map((s) => s.trim().toLowerCase().replace(/^([a-z]+:\/\/[^/]+).*$/, '$1'))
    .filter(Boolean),
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const originMatchers = env.clientOrigins.map((p) =>
  p.includes('*') ? new RegExp('^' + p.split('*').map(escapeRe).join('[a-z0-9-]*') + '$') : p,
);

/** True when a browser Origin header matches one of the configured CLIENT_URL entries. */
export function isAllowedOrigin(origin) {
  const o = String(origin).toLowerCase().replace(/\/+$/, '');
  return originMatchers.some((m) => (m instanceof RegExp ? m.test(o) : m === o));
}
