import { describe, it, expect } from 'vitest';

// Exercise the origin matcher with a realistic production CLIENT_URL (trailing slash, mixed case, wildcard)
process.env.CLIENT_URL = 'https://Nova-Dashboard.vercel.app/, https://nova-dashboard-*-sakeths-projects.vercel.app, http://localhost:5180';
const { env, isAllowedOrigin } = await import('../src/config/env.js');

describe('CORS origin matching', () => {
  it('normalises trailing slashes and case', () => {
    expect(env.clientOrigins).toEqual(['https://nova-dashboard.vercel.app', 'https://nova-dashboard-*-sakeths-projects.vercel.app', 'http://localhost:5180']);
    expect(isAllowedOrigin('https://nova-dashboard.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://NOVA-dashboard.vercel.app')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5180')).toBe(true);
  });
  it('supports a * wildcard for preview deployments only where placed', () => {
    expect(isAllowedOrigin('https://nova-dashboard-git-main-sakeths-projects.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://nova-dashboard-abc123-sakeths-projects.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://evil-sakeths-projects.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://nova-dashboard-x-sakeths-projects.vercel.app.evil.com')).toBe(false);
  });
  it('rejects unrelated and scheme-mismatched origins', () => {
    expect(isAllowedOrigin('http://nova-dashboard.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://nova-dashboard.vercel.app.attacker.io')).toBe(false);
    expect(isAllowedOrigin('https://example.com')).toBe(false);
  });
});
