/**
 * Administrator tool: make the demo accounts' passwords match DEMO_PASSWORD_* env vars.
 *   DEMO_PASSWORD_VIEWER=... npm run demo:sync
 * Safe to run repeatedly; only accounts whose password differs are updated (and their sessions revoked).
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { syncDemoPasswords, DEMO_ACCOUNTS, demoPasswordFor } from '../services/demoService.js';

connectDB()
  .then(async () => {
    const n = await syncDemoPasswords();
    for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(12)} ${a.email.padEnd(22)} ${demoPasswordFor(a.role) ? 'configured' : 'no password configured (set ' + a.envKey + ')'}`);
    console.log(n ? `${n} account(s) updated.` : 'All configured demo passwords already match.');
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
