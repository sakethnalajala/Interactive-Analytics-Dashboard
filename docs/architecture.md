# Architecture

## Monorepo layout

```
/
├─ api/index.js            Vercel serverless entry → exports the Express app
├─ client/                 React 18 + Vite + Tailwind + Recharts
│  └─ src/
│     ├─ components/ui      primitives (Button, Card, Badge, DataTable, Modal…)
│     ├─ components/layout  AppLayout, Sidebar, Header, DateRangePicker
│     ├─ components/charts  ChartCard, themed Recharts wrappers
│     ├─ features/auth      login page, ProtectedRoute, RoleRoute
│     ├─ pages/             one file per route
│     ├─ stores/            zustand: auth, theme, ui
│     ├─ hooks/             useDateRange (URL-synced), useDebounce, useTableParams
│     └─ lib/api.js         axios instance + silent refresh interceptor
├─ server/                 Node 20+ ESM, Express 4, Mongoose 8
│  └─ src/
│     ├─ app.js             express app (used by both local server and Vercel)
│     ├─ index.js           local listener
│     ├─ config/            env validation, db connection (cached for serverless)
│     ├─ models/            User, Customer, Product, Order, Session, Setting
│     ├─ middleware/        authenticate, authorize(roles), validate(zod), errorHandler
│     ├─ validation/        zod schemas per resource
│     ├─ services/          aggregation pipelines & business logic
│     ├─ controllers/       thin request/response handlers
│     ├─ routes/            express routers
│     └─ seed/              deterministic seed (faker, seed=42)
└─ docs/                   design-system, architecture, api, deployment, qa-report
```

**Why this shape:** controllers stay thin, services own the aggregation logic (unit-testable without HTTP), and the single `app.js` is reused by the local listener and the Vercel function so there is no drift between dev and prod.

## Data model

| Collection | Purpose | Notable indexes |
|---|---|---|
| `users` | dashboard accounts (staff), role, hashed password, hashed refresh tokens | `email` unique |
| `customers` | end-customers of the store (seed) — denormalised `totalSpent`, `orderCount` for fast lists | `createdAt`, `country`, `segment`, `name`, `email` |
| `products` | catalogue, price/cost/stock/rating | `category`, `sku` unique |
| `orders` | line-item snapshot (name/price at purchase time), status, payment | `createdAt`, `status`, `{createdAt,status}`, `customer` |
| `sessions` | web-analytics sessions with deepest funnel stage | `startedAt`, `funnelStage`, `customer` |
| `settings` | singleton org settings | — |

**Data provenance**
- *Seed data*: users, customers, products, orders, sessions, settings — generated once by `npm run seed` (deterministic, 18 months ending today).
- *Derived analytics*: every KPI, trend and breakdown is computed live with MongoDB aggregation pipelines. No numbers are hard-coded.

## KPI formulas

| KPI | Formula |
|---|---|
| Revenue | Σ `order.total` for status ∈ {processing, shipped, delivered} in range |
| Net revenue | Revenue − Σ `total` of refunded orders in range |
| Orders | count(orders in range, any status) |
| AOV | Revenue ÷ revenue-counted orders |
| Gross margin | (Revenue − Σ items.qty × items.unitCost) ÷ Revenue |
| Change % | (current − previous period of equal length) ÷ previous |
| Sessions | count(sessions in range) |
| Active users | distinct `session.customer` (non-null) in range |
| New users | customers with `createdAt` in range |
| Returning users | active users whose `createdAt` < range start |
| Conversion rate | sessions with `funnelStage = purchase` ÷ sessions |
| Funnel | count of sessions that reached ≥ stage (visit → product_view → add_to_cart → checkout → purchase) |
| Cart abandonment | 1 − purchase ÷ checkout |
| Customer LTV (avg) | mean `customer.totalSpent` |

## Authentication flow

1. `POST /api/auth/login` → verifies bcrypt hash → returns `{ user, accessToken }` (15 min JWT) and sets `refreshToken` **httpOnly, Secure (prod), SameSite=Lax** cookie (7 d). A SHA-256 hash of the refresh token is stored on the user (max 5 devices).
2. Client keeps the access token **in memory only** (zustand) and attaches it as `Authorization: Bearer`.
3. On 401 the axios interceptor calls `POST /api/auth/refresh` once, rotates the refresh token, retries the original request; on failure it clears state and redirects to `/login`.
4. `POST /api/auth/logout` deletes the stored hash and clears the cookie → the session is really revoked.
5. `authorize('admin', 'super_admin')` middleware enforces roles server-side on every mutating or export route. The frontend only hides UI.

## Roles

| Capability | super_admin | admin | analyst | viewer |
|---|:-:|:-:|:-:|:-:|
| View dashboards | ✓ | ✓ | ✓ | ✓ |
| Export CSV | ✓ | ✓ | ✓ | ✗ |
| Create / edit / archive products, update order status | ✓ | ✓ | ✗ | ✗ |
| Organisation settings | ✓ | ✓ | ✗ | ✗ |
| Manage team members | ✓ | ✗ | ✗ | ✗ |
| Own profile / password / theme | ✓ | ✓ | ✓ | ✓ |

## Frontend state strategy

- **Server state** → TanStack Query (caching, dedupe, loading/error, refetch when the date range changes). Query keys include all filters.
- **Client state** → zustand: `authStore` (user, accessToken), `themeStore`, `uiStore` (sidebar).
- **URL state** → global date range (`?from&to`) and table params (`?page&sort&q…`) so views are shareable and survive refresh.
- Forms → react-hook-form + zod.

## Filtering rules

- Global date range (header) drives: Overview, Analytics, Revenue, Orders stats, Customers stats, Products stats, Reports.
- Lists (Customers / Products / Orders) filter, search, sort and paginate **server-side**.
- CSV export is server-side and streams the **full filtered dataset**, not just the visible page. Requires analyst+.
