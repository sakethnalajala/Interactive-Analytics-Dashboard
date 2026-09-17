import { describe, it, expect } from 'vitest';

// Simulate a production deployment with no DEMO_PASSWORD_* variables configured
process.env.NODE_ENV = 'production';
process.env.JWT_REFRESH_SECRET = 'a-refresh-secret-for-derivation-tests-0123456789';
delete process.env.DEMO_PASSWORD_VIEWER;
process.env.DEMO_PASSWORD_ADMIN = 'ExplicitAdmin99';
const { demoPasswordFor, publicDemoAccounts, DEMO_ACCOUNTS } = await import('../src/services/demoService.js');

describe('derived demo passwords (production, no env vars)', () => {
  it('publishes a distinct, policy-compliant password for every role', () => {
    const pws = DEMO_ACCOUNTS.map((a) => demoPasswordFor(a.role));
    expect(pws.every(Boolean)).toBe(true);
    expect(new Set(pws).size).toBe(4);
    for (const pw of pws) expect(pw).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/);
    expect(publicDemoAccounts().every((a) => a.password)).toBe(true);
  });
  it('is deterministic for the same secret and does not contain it', () => {
    const a = demoPasswordFor('viewer');
    expect(demoPasswordFor('viewer')).toBe(a);
    expect(a).not.toContain(process.env.JWT_REFRESH_SECRET.slice(0, 8));
    expect(a).toMatch(/^Demo-Viewer-[0-9a-f]{10}$/);
  });
  it('lets an explicit DEMO_PASSWORD_* override the derived value', () => {
    expect(demoPasswordFor('admin')).toBe('ExplicitAdmin99');
  });
});
