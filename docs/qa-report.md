# QA Report

Date: 2026-09-16 · Environment: Windows 11, Node 24.18, MongoDB 8.3 (local), Chrome headless (Puppeteer) · Build: `vite build` ✔ · Lint: `eslint .` ✔ (0 warnings)

## Automated

| Suite | Result |
|---|---|
| Backend integration (`server/tests/api.test.js`, Vitest + Supertest) | **26 / 26 passed** — auth (generic errors, validation, cookie flags, deactivated accounts, rotation + reuse detection, token requirement), RBAC for all four roles, exact KPI arithmetic (revenue 300 / AOV 150 / margin 53.3 % / previous-period delta), category shares sum to 100, gap-free trend series, funnel counts, range validation, server-side pagination/sort/search/filters, regex-escaped search, product CRUD + duplicate SKU (409) + 404, order transition rules + customer total sync, password change, report shape, CSV headers/BOM/row count, consistent 404 envelope, malformed JSON, bad ObjectId |
| Frontend unit (`client/src/test/ui.test.jsx`, Vitest + RTL) | **13 / 13 passed** — formatters, UTC axis dates, date presets/validation, role helpers, theme store persistence + `<html class="dark">`, KpiCard value/delta/skeleton, Badge, DataTable sort/pagination/empty/error, ProtectedRoute redirect, RoleRoute gating |
| Headless browser sweep (`scratchpad/qa/run.mjs`) | All 9 pages render with correct `<h1>`, no lingering skeletons, **0 page errors, 0 failed requests, 0 unexpected API errors** in light, dark and 390 px mobile; document `scrollWidth` = viewport on mobile (no horizontal overflow). Unauthenticated `/overview` → `/login`; wrong password shows inline alert; login → `/overview`; search + row click opens the order drawer; full reload keeps the session; sign-out clears it and re-protects routes. |

## Security probes (all rejected as expected)

| Probe | Result |
|---|---|
| Forged JWT with wrong secret | 401 `TOKEN_INVALID` |
| `alg: none` token | 401 `TOKEN_INVALID` |
| Valid viewer token, elevated `role` claim | 403 — role is re-read from the database on every request |
| NoSQL operator injection in login body | 400 — Zod requires strings |
| 25 rapid failed logins | 429 after the limit |
| Concurrent refresh with the same cookie | both succeed (10 s grace) — reuse after the window revokes all sessions |
| Disallowed CORS origin | 403 (no stack trace) |
| Secrets in repo | none — `.env` files are gitignored, `.env.example` has placeholders |
| Security headers | Helmet CSP, HSTS, nosniff, frame options; `X-Powered-By` removed |

## Manual checklist (§10 of the brief)

| Check | Status |
|---|---|
| No broken routes — all 9 pages + landing, login, 404, `/dashboard` redirect | ✔ |
| No non-functional buttons — every action either navigates, mutates via API, exports, or opens a dialog | ✔ |
| No placeholder functionality — notifications menu links to real filtered views; no "coming soon" | ✔ |
| Valid API connections — all 30 endpoints exercised via curl/tests; frontend uses only real endpoints | ✔ |
| No auth bypass — see probes above; frontend guards are UI-only, API enforces | ✔ |
| No exposed secrets | ✔ |
| No console errors — only expected 401s from the unauthenticated refresh probe and the deliberate wrong-password test | ✔ |
| No duplicate server processes — one API (5001) and one Vite (5180) process; ports 5000/5173 belong to unrelated projects on this machine | ✔ |
| Responsive — 1440 (full sidebar), 1024–1279 (rail), 768–1023 (drawer), 390 (single column, scrollable tables) | ✔ |
| Dark / light theme usable — screenshots reviewed for every page; charts, tooltips and inputs re-theme via CSS variables | ✔ |
| Chart calculations — verified by exact-value tests and cross-checked (e.g., orders-by-status counts sum to the Orders KPI; category shares sum to 100 %) | ✔ |
| Filtering / sorting — server-side, URL-synced, verified in tests and browser | ✔ |

## Edge cases verified

- Empty ranges render "No data for this period" instead of blank charts.
- Inverted / future / >3-year custom ranges are blocked in the picker and by the API.
- Searching an order number outside the selected period still finds it (search bypasses the date scope — label shows "Searching all time").
- Terminal order states (`cancelled`, `refunded`) expose no transitions; illegal transitions return 400 with the allowed list.
- Super Admin cannot demote or deactivate their own account.
- Password change / role change / deactivation revoke refresh tokens on other devices.
- CSV cells starting with `= + - @` are prefixed to defuse spreadsheet formulas.

## Fixed during QA

1. **Session lost on reload** — React StrictMode double-fired the bootstrap refresh, and the second call tripped reuse detection. Fixed with a shared in-flight promise on the client and a 10 s rotation grace window on the server (also covers multi-tab opens).
2. **CORS rejection surfaced as a 500** — now a clean 403 `FORBIDDEN`.
3. **KPI values truncated** at six-up on 1440 px — grid now 3-up until 2xl; currency compacts only ≥ $1 M.
4. **Donut legend overflow** for long currency values — compact formatting + `min-w-0`.
5. **Top-products table overflow** in narrow cards — name column truncates via `max-w-0`.
6. **Crowded x-axis ticks on mobile** — `interval="preserveStartEnd"` with a minimum gap.
7. **Unrealistic 13 % conversion** — seeded non-converting traffic increased (now ≈ 6.3 %, 51 % cart abandonment).

## Known limitations

- Vercel deployment is configured (`vercel.json`, `api/index.js`, `docs/deployment.md`) but **not executed** from this environment — no Vercel CLI login or Atlas credentials were available. The live URL must be verified after you deploy.
- Timezone: all analytics are computed in UTC; the Settings timezone field is stored but does not shift aggregation buckets.
- Sessions in the seed are synthetic; "returning users" is defined as active users whose sign-up predates the range start.
