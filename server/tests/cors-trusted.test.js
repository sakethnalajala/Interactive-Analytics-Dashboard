import { describe, it, expect } from 'vitest';

// A production CLIENT_URL that does NOT include the Vercel origins — the built-in trusted list must still allow them
process.env.CLIENT_URL = 'https://custom-domain.example.com';
const { env, isAllowedOrigin } = await import('../src/config/env.js');

describe('built-in trusted origins', () => {
  it("always allows this project's Vercel deployments and local dev, plus CLIENT_URL", () => {
    expect(env.clientOrigins).toContain('https://custom-domain.example.com');
    expect(isAllowedOrigin('https://custom-domain.example.com')).toBe(true);
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-client-kkut-qutdhlmb7.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-client-kkut.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-client-kkut-git-main-team.vercel.app')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5180')).toBe(true);
    // the current production project (Vercel auto-suffixed the name) and its per-deployment hosts
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-cli-ivory.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-cli-9f8e7d6c5-sakeths-projects.vercel.app')).toBe(true);
  });
  it('still rejects unrelated origins', () => {
    expect(isAllowedOrigin('https://interactive-analytics-dashboard.vercel.app')).toBe(false); // no dash-suffix → not this family
    expect(isAllowedOrigin('https://evil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://interactive-analytics-dashboard-client-kkut.vercel.app.evil.com')).toBe(false);
  });
});
