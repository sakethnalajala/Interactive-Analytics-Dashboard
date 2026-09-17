# API Reference

Base URL: `/api`. All responses use one envelope:

```json
{ "success": true,  "data": { … } }
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "Validation failed", "details": [{ "path": "email", "message": "…" }] } }
```

Error codes: `BAD_REQUEST` (400) · `UNAUTHORIZED` / `TOKEN_EXPIRED` / `TOKEN_INVALID` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `RATE_LIMITED` (429) · `INTERNAL_ERROR` (500).

**Auth**: send `Authorization: Bearer <accessToken>`. Roles: `super_admin` > `admin` > `analyst` > `viewer`.
**Date range**: every analytics endpoint accepts `from`, `to` (`YYYY-MM-DD`, inclusive, UTC, max 3 years, default last 30 days) and optional `granularity` (`day|week|month`, auto-picked from the span otherwise). The response `meta` echoes the resolved range and granularity, and every KPI is `{ value, previous, change }` where `previous` is the immediately preceding period of equal length.

| Method | Path | Roles | Purpose / notes |
|---|---|---|---|
| GET | `/health` | public | Liveness probe |
| POST | `/auth/login` | public (rate-limited) | `{ email, password }` → `{ user, accessToken }` + httpOnly refresh cookie |
| POST | `/auth/refresh` | cookie | Rotates the refresh token, returns a new access token |
| POST | `/auth/logout` | cookie | Revokes the refresh token and clears the cookie |
| GET | `/auth/me` | any | Current user |
| GET | `/dashboard/overview` | any | KPIs (with sparklines), revenue trend vs previous, revenue by category, orders by status, top products, recent orders, traffic sources |
| GET | `/analytics/engagement` | any | Sessions / active / new / returning users, duration, pages per session, conversion, cart abandonment; trend, device & source breakdowns, 7×24 heatmap |
| GET | `/analytics/funnel` | any | Funnel stages with rate + drop-off, conversion trend |
| GET | `/revenue` | any | Revenue KPIs, trend, by category / payment / weekday / channel, top products |
| GET | `/revenue/trend` | any | Trend only (used when the user switches granularity) |
| GET | `/customers/stats` | any | Customer KPIs, growth (new + cumulative), by segment / country, top customers |
| GET | `/customers` | any | `page limit search sort order segment country` — server-side list |
| GET | `/customers/filters` | any | Segment + country options |
| GET | `/customers/:id` | any | Customer + recent orders |
| GET | `/customers/export` | analyst+ | CSV of the **full filtered** list |
| GET | `/products/stats` | any | Product KPIs, category performance, top products |
| GET | `/products` | any | `page limit search sort order category status(active\|archived\|low_stock)`; rows include all-time `unitsSold` and `revenue` |
| GET | `/products/filters` | any | Category + status options |
| POST | `/products` | admin+ | Create (`name sku category price cost stock description`) |
| PATCH | `/products/:id` | admin+ | Partial update |
| DELETE | `/products/:id` | admin+ | Soft-archive (`isActive=false`) |
| GET | `/products/export` | analyst+ | CSV |
| GET | `/orders/stats` | any | Order KPIs, trend stacked by status, status / payment / channel breakdowns |
| GET | `/orders` | any | `page limit search sort order status paymentMethod from to` |
| GET | `/orders/filters` | any | Status + payment options |
| GET | `/orders/:id` | any | Order detail + `allowedTransitions` |
| PATCH | `/orders/:id/status` | admin+ | Validated state machine: pending→processing/cancelled, processing→shipped/cancelled, shipped→delivered/refunded, delivered→refunded. Keeps customer totals in sync. |
| GET | `/orders/export` | analyst+ | CSV |
| GET | `/reports/types` | any | Available report types and their filters |
| GET | `/reports/:type` | any | `revenue \| orders \| customers \| products \| engagement` + range + filters → `{ summary, columns, rows, chart }` |
| GET | `/reports/:type/export` | analyst+ | CSV using the same columns (list reports drop the 2,000-row preview cap) |
| GET | `/profile` | any | Current profile |
| PATCH | `/profile` | any | `name jobTitle avatarColor preferences{theme,defaultDateRange,compactTables}` |
| PATCH | `/auth/password` | any | `{ currentPassword, newPassword }` — bcrypt-verifies the current password, stores a new bcrypt hash, keeps this device signed in and revokes every other device. Rate-limited. (`/profile/password` is a legacy alias that revokes all devices.) |
| GET | `/settings` | any | Organisation settings |
| PATCH | `/settings` | admin+ | `orgName currency timezone fiscalYearStartMonth lowStockThreshold weekStartsOn` |
| GET | `/settings/users` | super_admin | Team list |
| POST | `/settings/users` | super_admin | Create user (`name email password role jobTitle`) |
| PATCH | `/settings/users/:id` | super_admin | `name role isActive jobTitle password` — cannot demote/deactivate self; role/active changes revoke sessions |

Validation is performed with Zod on every body, query and `:id` param; unknown keys in bodies are rejected (`.strict()`), list `limit` is capped at 100, and search strings are regex-escaped.
