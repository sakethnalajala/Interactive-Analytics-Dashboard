# Nova Analytics — Interactive Analytics Dashboard

A premium, SaaS-style analytics platform for monitoring an e-commerce business: revenue, engagement, conversion funnels, customers, products, orders and exportable reports — with real authentication, role-based access and live-computed analytics.

**Stack:** React 18 · Vite · Tailwind CSS · Recharts · TanStack Query · Zustand · React Hook Form + Zod — Node 20 · Express 4 · MongoDB Atlas · Mongoose 8 · JWT — Vitest · Supertest · Testing Library — Vercel.

## Features

- **9 dashboard views** — Overview, Analytics, Sales & Revenue, Customers, Products, Orders, Reports, Settings, Profile.
- **Live analytics** — every KPI, trend and breakdown is a MongoDB aggregation over ~12 k orders and ~180 k sessions (18 months, seeded deterministically). Each KPI is compared with the previous period of equal length.
- **Global date range** (presets + custom) persisted in the URL; charts and KPIs refetch on change with cached transitions.
- **Server-side lists** — search, category/status/segment filters, sortable columns and pagination for customers, products and orders, all in the URL so views are shareable.
- **Report builder** — five report types with filters, summary tiles, chart, sortable preview table and full-dataset **CSV export** (streamed, BOM + formula-injection safe).
- **CRUD with rules** — admins create/edit/archive products and move orders through a validated status state machine that keeps customer lifetime totals consistent.
- **Security** — bcrypt (cost 12), 15-minute access JWT held in memory, rotating httpOnly refresh cookie with reuse detection, server-side RBAC on every route, Zod validation, Helmet, rate limiting, generic auth errors, regex-escaped search.
- **Design system** — token-based light/dark theme with no flash on load, glass header, skeleton/empty/error states everywhere, responsive from 390 px to 4K, reduced-motion aware.
- **Quality** — 26 backend integration tests (exact KPI arithmetic, RBAC, transitions, CSV) + 13 frontend unit tests, ESLint clean, headless-browser QA across every page in both themes and mobile.

## Roles

| Capability | Super Admin | Admin | Analyst | Viewer |
|---|:-:|:-:|:-:|:-:|
| View all dashboards | ✓ | ✓ | ✓ | ✓ |
| Export CSV | ✓ | ✓ | ✓ | – |
| Edit products / order status / org settings | ✓ | ✓ | – | – |
| Manage team | ✓ | – | – | – |

Demo accounts (password `Password123`): `superadmin@demo.com`, `admin@demo.com`, `analyst@demo.com`, `viewer@demo.com`.

## Quick start

```bash
git clone <repo> && cd interactive-analytics-dashboard
npm install
cp server/.env.example server/.env    # set MONGODB_URI and two random JWT secrets
cp client/.env.example client/.env
npm run seed                          # ~20 s: users, products, customers, orders, sessions
npm run dev                           # API → http://localhost:5001/api, app → http://localhost:5180
```

Other scripts: `npm test` (server + client), `npm run test:server`, `npm run test:client`, `npm run lint`, `npm run build`.

Backend tests use an in-memory MongoDB by default; set `MONGODB_TEST_URI` to reuse a local server (faster on Windows).

## Project structure

```
api/index.js        Vercel serverless entry (exports the Express app)
client/             React app — components/ui, components/charts, components/layout, pages, features/auth, stores, hooks, api
server/             Express API — config, models, middleware, validation, services (aggregations), controllers, routes, seed, tests
docs/               design-system · architecture · api · deployment · qa-report
vercel.json         static build + /api rewrite to the function
```

See **docs/architecture.md** for the data model, KPI formulas and auth flow, **docs/api.md** for every endpoint, and **docs/deployment.md** for Vercel + Atlas setup.

## Data provenance

| Kind | What |
|---|---|
| Seed data | users, products, customers, orders (with line-item snapshots), sessions (with funnel stage), settings — generated once by `npm run seed` with a fixed Faker seed |
| Derived analytics | every number on the dashboard — computed at request time by aggregation pipelines |

There is no simulated or hard-coded metric anywhere in the UI.
